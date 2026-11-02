import {
  browserCookie,
  requireCsrf,
  tokenHash,
  type PasswordAuthConfig,
} from './browser-security.js';
import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { FastifyRequest } from 'fastify';
import type { components } from '@eas/api-contract';
import type { Sql, Database } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
type Grant = components['schemas']['DatasetGrant'];
export interface Actor {
  userId: string;
  displayName: string;
  clientKind: 'human' | 'ai';
  authenticatedAt: number;
  authMethod?: 'password' | undefined;
  browserSession?: { id: string } | undefined;
  personalToken?: { id: string; organizationId: string; scope: 'read' | 'develop' } | undefined;
}
export interface Subject extends Actor {
  organizationId: string;
  actions: Set<string>;
}
export interface AuthConfig {
  allowLocalSessions: boolean;
  passwordAuth?: PasswordAuthConfig | undefined;
  csrfKey?: string | undefined;
  oidc?:
    | { issuer: string; audience: string; jwksUrl: string; humanClientIds: string[] }
    | undefined;
}
interface GrantRow {
  id: string;
  organization_id: string;
  principal_user_id: string;
  resource_id: string;
  action: Grant['action'];
  expires_at: Date;
  created_at: Date;
  constraints: { fieldKeys?: string[]; metricKeys?: string[] };
}
const grant = (r: GrantRow): Grant => ({
  id: r.id,
  organizationId: r.organization_id,
  principalUserId: r.principal_user_id,
  resourceId: r.resource_id,
  action: r.action,
  expiresAt: r.expires_at.toISOString(),
  createdAt: r.created_at.toISOString(),
  fieldKeys: r.constraints.fieldKeys ?? [],
  metricKeys: r.constraints.metricKeys ?? [],
});
export class Identity {
  async releaseMembers(tx: Sql, s: Subject) {
    this.require(s, 'release.read');
    return {
      members: await tx.all<components['schemas']['ReleaseMember']>(
        `SELECT m.user_id AS "userId",u.display_name AS "displayName",m.department_codes AS "departmentCodes",EXISTS(SELECT 1 FROM role_bindings b JOIN role_permissions p ON p.organization_id=b.organization_id AND p.role_id=b.role_id WHERE b.organization_id=m.organization_id AND b.user_id=m.user_id AND p.permission_key='release.approve') AS "canApprove" FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.status='active' AND u.status='active' ORDER BY u.display_name,m.user_id`,
        [s.organizationId],
      ),
    };
  }
  async issueReleaseGrant(
    tx: Sql,
    s: Subject,
    resourceId: string,
    action: 'app.view' | 'report.view' | 'dataset.query.production',
    fieldKeys: string[] = [],
    metricKeys: string[] = [],
    expiresAt = '9999-12-31T00:00:00.000Z',
  ) {
    this.require(s, action);
    const previous = await tx.one<{
      constraints: { fieldKeys?: string[]; metricKeys?: string[] };
      expires_at: Date;
    }>(
      'SELECT constraints,expires_at FROM resource_grants WHERE organization_id=$1 AND resource_id=$2 AND principal_user_id=$3 AND action=$4 AND expires_at>now()',
      [s.organizationId, resourceId, s.userId, action],
    );
    const constraints = {
      fieldKeys: [...new Set([...(previous?.constraints.fieldKeys ?? []), ...fieldKeys])],
      metricKeys: [...new Set([...(previous?.constraints.metricKeys ?? []), ...metricKeys])],
    };
    await tx.exec(
      'INSERT INTO resource_grants(organization_id,resource_id,principal_user_id,action,expires_at,constraints) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(organization_id,resource_id,principal_user_id,action) DO UPDATE SET constraints=EXCLUDED.constraints,expires_at=greatest(resource_grants.expires_at,EXCLUDED.expires_at)',
      [s.organizationId, resourceId, s.userId, action, expiresAt, JSON.stringify(constraints)],
    );
  }
  async dataScope(tx: Sql, subject: Subject): Promise<string[]> {
    const row = await tx.one<{ department_codes: string[] }>(
      "SELECT department_codes FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND status='active'",
      [subject.organizationId, subject.userId],
    );
    if (!row) throw new Fault(403, 'FORBIDDEN');
    return row.department_codes;
  }
  async setDataScope(
    tx: Sql,
    subject: Subject,
    userId: string,
    departmentCodes: string[],
  ): Promise<void> {
    this.require(subject, 'permission.manage', true);
    if (
      !(await tx.exec(
        "UPDATE organization_members SET department_codes=$3 WHERE organization_id=$1 AND user_id=$2 AND status='active'",
        [subject.organizationId, userId, departmentCodes],
      ))
    )
      throw new Fault(404, 'NOT_FOUND');
  }
  /** Data plane has no catalog-administrator bypass. Every caller needs an explicit current resource grant. */
  async queryGrant(tx: Sql, subject: Subject, resourceId: string, action: string): Promise<Grant> {
    this.require(subject, action);
    return this.currentGrant(tx, subject, resourceId, action);
  }
  private async currentGrant(
    tx: Sql,
    subject: Subject,
    resourceId: string,
    action: string,
  ): Promise<Grant> {
    // Only inspect this caller's grant. Missing access must not disclose another user's grants or resource existence.
    const row = await tx.one<GrantRow & { is_current: boolean }>(
      'SELECT *,expires_at>now() AS is_current FROM resource_grants WHERE organization_id=$1 AND resource_id=$2 AND principal_user_id=$3 AND action=$4',
      [subject.organizationId, resourceId, subject.userId, action],
    );
    const details = [
      { field: 'resourceId', reason: resourceId },
      { field: 'permission', reason: action },
    ];
    if (!row)
      throw new Fault(
        404,
        'RESOURCE_GRANT_REQUIRED',
        '当前账号没有此资源的 ' +
          action +
          ' 授权，或该资源不在当前组织。请在访问权限中检查当前账号的资源授权。',
        details,
      );
    if (!row.is_current)
      throw new Fault(
        403,
        'RESOURCE_GRANT_EXPIRED',
        '当前账号的 ' + action + ' 资源授权已到期。请在访问权限中更新此项授权。',
        [...details, { field: 'expiresAt', reason: row.expires_at.toISOString() }],
      );
    return grant(row);
  }
  private readonly jwks: JWTVerifyGetKey | undefined;
  constructor(
    private readonly db: Database,
    private readonly config: AuthConfig,
  ) {
    if (config.oidc) {
      const url = new URL(config.oidc.jwksUrl);
      if (url.protocol !== 'https:') throw new Error('OIDC_HTTPS_REQUIRED');
      this.jwks = createRemoteJWKSet(url, { timeoutDuration: 5000 });
    }
  }
  async authenticate(req: FastifyRequest): Promise<Actor> {
    const header = req.headers.authorization;
    if (header === undefined) {
      const cfg = this.config.passwordAuth,
        cookie = browserCookie(req, cfg);
      if (!cfg || !cookie) throw new Fault(401, 'UNAUTHENTICATED');
      const row = await this.db.global.one<{
        id: string;
        user_id: string;
        display_name: string;
        issued_at: Date;
        must_change_password: boolean;
      }>(
        "SELECT s.id,s.user_id,u.display_name,s.issued_at,a.must_change_password FROM auth_sessions s JOIN users u ON u.id=s.user_id JOIN password_accounts a ON a.user_id=u.id WHERE s.token_hash=$1 AND s.auth_method='password' AND s.client_kind='human' AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active'",
        [tokenHash(cookie)],
      );
      if (!row) throw new Fault(401, 'UNAUTHENTICATED');
      requireCsrf(req, cfg, this.config.csrfKey!, row.id);
      if (
        row.must_change_password &&
        !['/v1/auth/session', '/v1/auth/password', '/v1/auth/logout'].includes(
          req.url.split('?')[0]!,
        )
      )
        throw new Fault(403, 'PASSWORD_CHANGE_REQUIRED');
      return {
        userId: row.user_id,
        displayName: row.display_name,
        clientKind: 'human',
        authenticatedAt: row.issued_at.getTime(),
        authMethod: 'password',
        browserSession: { id: row.id },
      };
    }
    if (!header?.startsWith('Bearer ') || header.length > 8192)
      throw new Fault(401, 'UNAUTHENTICATED');
    const token = header.slice(7);
    if (token.startsWith('eas_pat_')) {
      if (!/^eas_pat_[A-Za-z0-9_-]{43}$/.test(token)) throw new Fault(401, 'UNAUTHENTICATED');
      const row = await this.db.global.one<{
        id: string;
        organization_id: string;
        user_id: string;
        display_name: string;
        scope: 'read' | 'develop';
        created_at: Date;
      }>('SELECT * FROM eas_authenticate_personal_token($1)', [
        createHash('sha256').update(token).digest('hex'),
      ]);
      if (!row) throw new Fault(401, 'UNAUTHENTICATED');
      return {
        userId: row.user_id,
        displayName: row.display_name,
        clientKind: 'ai',
        authenticatedAt: row.created_at.getTime(),
        personalToken: { id: row.id, organizationId: row.organization_id, scope: row.scope },
      };
    }
    if (this.config.allowLocalSessions && token.startsWith('eas_local_')) {
      const row = await this.db.global.one<{
        user_id: string;
        display_name: string;
        client_kind: 'human' | 'ai';
        issued_at: Date;
      }>(
        `SELECT s.user_id,u.display_name,s.client_kind,s.issued_at FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.status='active'`,
        [createHash('sha256').update(token).digest('hex')],
      );
      if (!row) throw new Fault(401, 'UNAUTHENTICATED');
      return {
        userId: row.user_id,
        displayName: row.display_name,
        clientKind: row.client_kind,
        authenticatedAt: row.issued_at.getTime(),
      };
    }
    if (!this.jwks || !this.config.oidc) throw new Fault(401, 'UNAUTHENTICATED');
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.oidc.issuer,
        audience: this.config.oidc.audience,
        algorithms: ['RS256', 'ES256'],
      });
      if (!payload.sub) throw new Error();
      const user = await this.db.global.one<{ id: string; display_name: string }>(
        "SELECT id,display_name FROM users WHERE oidc_issuer=$1 AND oidc_subject=$2 AND status='active'",
        [payload.iss, payload.sub],
      );
      if (!user) throw new Error();
      const authorizedParty =
        typeof payload['azp'] === 'string' ? payload['azp'] : payload['client_id'];
      const human =
        typeof authorizedParty === 'string' &&
        this.config.oidc.humanClientIds.includes(authorizedParty) &&
        Array.isArray(payload['amr']) &&
        payload['amr'].some((v) => ['mfa', 'otp', 'hwk'].includes(String(v)));
      return {
        userId: user.id,
        displayName: user.display_name,
        clientKind: human ? 'human' : 'ai',
        authenticatedAt: typeof payload['auth_time'] === 'number' ? payload['auth_time'] * 1000 : 0,
      };
    } catch {
      throw new Fault(401, 'UNAUTHENTICATED');
    }
  }
  async subject(tx: Sql, actor: Actor, organizationId: string): Promise<Subject> {
    if (actor.browserSession) {
      const row = await tx.one<{ must_change_password: boolean }>(
        "SELECT a.must_change_password FROM auth_sessions s JOIN password_accounts a ON a.user_id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.auth_method='password' AND s.revoked_at IS NULL AND s.expires_at>now()",
        [actor.browserSession.id, actor.userId],
      );
      if (!row) throw new Fault(401, 'UNAUTHENTICATED');
      if (row.must_change_password) throw new Fault(403, 'PASSWORD_CHANGE_REQUIRED');
    }
    if (actor.personalToken) {
      if (actor.personalToken.organizationId !== organizationId) throw new Fault(403, 'FORBIDDEN');
      const active = await tx.one(
        'SELECT id FROM personal_access_tokens WHERE organization_id=$1 AND id=$2 AND user_id=$3 AND revoked_at IS NULL AND expires_at>now()',
        [organizationId, actor.personalToken.id, actor.userId],
      );
      if (!active) throw new Fault(401, 'UNAUTHENTICATED');
    }
    const membership = await tx.one<{ status: string }>(
      `SELECT m.status FROM organization_members m JOIN users u ON u.id=m.user_id WHERE m.organization_id=$1 AND m.user_id=$2 AND u.status='active'`,
      [organizationId, actor.userId],
    );
    if (membership?.status !== 'active') throw new Fault(403, 'FORBIDDEN');
    const actions = await tx.all<{ permission_key: string }>(
      `SELECT DISTINCT p.permission_key FROM role_bindings b JOIN role_permissions p ON p.organization_id=b.organization_id AND p.role_id=b.role_id WHERE b.organization_id=$1 AND b.user_id=$2`,
      [organizationId, actor.userId],
    );
    const allowed = new Set([
      'session.read',
      'source.read',
      'dataset.read',
      'app.view',
      'report.view',
      'release.read',
      ...(actor.personalToken?.scope === 'develop'
        ? ['app.create', 'app.develop', 'dataset.query.test', 'release.create']
        : []),
    ]);
    return {
      ...actor,
      organizationId,
      actions: new Set(
        actions
          .map((a) => a.permission_key)
          .filter((key) => !actor.personalToken || allowed.has(key)),
      ),
    };
  }
  require(subject: Subject, action: string, human = false): void {
    if (!subject.actions.has(action)) throw new Fault(403, 'FORBIDDEN');
    if (human && subject.clientKind !== 'human') throw new Fault(403, 'FORBIDDEN');
  }
  requireConnection(subject: Subject, environment: string, operation: 'health' | 'metadata'): void {
    this.require(subject, 'connection.manage', true);
    this.require(
      subject,
      `connection.${operation === 'health' ? 'test' : 'metadata'}.${environment}`,
    );
    if (environment === 'production' && Date.now() - subject.authenticatedAt > 300_000)
      throw new Fault(403, 'FORBIDDEN', 'Fresh interactive authentication required');
  }
  isCatalogAdmin(subject: Subject): boolean {
    return subject.actions.has('catalog.manage');
  }
  async memberships(actor: Actor): Promise<{ id: string; name: string }[]> {
    const rows = await this.db.global.all<{ id: string; name: string }>(
      'SELECT * FROM eas_user_organizations($1)',
      [actor.userId],
    );
    return rows.filter(
      (row) => !actor.personalToken || row.id === actor.personalToken.organizationId,
    );
  }
  async allowed(
    tx: Sql,
    subject: Subject,
    resourceId: string,
    action: string,
  ): Promise<Grant | null> {
    this.require(subject, action);
    if (this.isCatalogAdmin(subject)) return null;
    return this.currentGrant(tx, subject, resourceId, action);
  }
  async visible(tx: Sql, subject: Subject, action: string): Promise<Set<string> | null> {
    this.require(subject, action);
    if (this.isCatalogAdmin(subject)) return null;
    const rows = await tx.all<{ resource_id: string }>(
      `SELECT resource_id FROM resource_grants WHERE organization_id=$1 AND principal_user_id=$2 AND action=$3 AND expires_at>now()`,
      [subject.organizationId, subject.userId, action],
    );
    return new Set(rows.map((r) => r.resource_id));
  }
  async grants(tx: Sql, subject: Subject, resourceId: string): Promise<Grant[]> {
    this.require(subject, 'permission.manage', true);
    return (
      await tx.all<GrantRow>(
        'SELECT * FROM resource_grants WHERE organization_id=$1 AND resource_id=$2 ORDER BY created_at DESC,id DESC',
        [subject.organizationId, resourceId],
      )
    ).map(grant);
  }
  async createGrant(
    tx: Sql,
    subject: Subject,
    resourceId: string,
    input: components['schemas']['CreateDatasetGrant'],
  ): Promise<Grant> {
    this.require(subject, 'permission.manage', true);
    this.require(subject, input.action);
    const member = await tx.one(
      "SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND status='active'",
      [subject.organizationId, input.principalUserId],
    );
    if (!member) throw new Fault(422, 'VALIDATION_ERROR');
    if (
      Date.parse(input.expiresAt) <= Date.now() ||
      Date.parse(input.expiresAt) > Date.now() + 366 * 86400_000
    )
      throw new Fault(422, 'VALIDATION_ERROR');
    const row = requireValue(
      await tx.one<GrantRow>(
        `INSERT INTO resource_grants(organization_id,resource_id,principal_user_id,action,expires_at,constraints) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          subject.organizationId,
          resourceId,
          input.principalUserId,
          input.action,
          input.expiresAt,
          JSON.stringify({ fieldKeys: input.fieldKeys, metricKeys: input.metricKeys }),
        ],
      ),
    );
    return grant(row);
  }
  async revokeGrant(tx: Sql, subject: Subject, id: string): Promise<Grant> {
    this.require(subject, 'permission.manage', true);
    return grant(
      requireValue(
        await tx.one<GrantRow>(
          'DELETE FROM resource_grants WHERE organization_id=$1 AND id=$2 RETURNING *',
          [subject.organizationId, id],
        ),
      ),
    );
  }
}
