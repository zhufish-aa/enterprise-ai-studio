import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { components } from '@eas/api-contract';
import type { Database, Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import { Mutations } from '../infrastructure/mutations.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
import type { Identity, Actor, Subject } from './identity.js';
import { hashPassword, verifyPassword, requirePassword } from './passwords.js';
import {
  browserCookie,
  csrfToken,
  requireOrigin,
  sessionCookie,
  tokenHash,
  type PasswordAuthConfig,
} from './browser-security.js';
type S = components['schemas'];
interface InvitationRow {
  id: string;
  organization_id: string;
  label: string;
  role_kind: 'viewer' | 'developer';
  role_id: string;
  created_by: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  used_at: Date | null;
}
const invitationDto = (r: InvitationRow): S['RegistrationInvitation'] => ({
  id: r.id,
  label: r.label,
  role: r.role_kind,
  createdAt: r.created_at.toISOString(),
  expiresAt: r.expires_at.toISOString(),
  revokedAt: r.revoked_at?.toISOString() ?? null,
  usedAt: r.used_at?.toISOString() ?? null,
});
const businessActions = {
  viewer: [
    'session.read',
    'source.read',
    'dataset.read',
    'dataset.query.production',
    'release.read',
    'app.view',
    'report.view',
  ],
  developer: [
    'session.read',
    'source.read',
    'dataset.read',
    'dataset.query.test',
    'dataset.query.production',
    'release.read',
    'release.create',
    'app.view',
    'report.view',
    'app.create',
    'app.develop',
  ],
};
interface RegistrationSettingsRow {
  organization_id: string;
  invitation_required: boolean;
  revision: number;
  updated_at: Date;
}
async function registrationSettings(tx: Sql, org: string): Promise<S['RegistrationSettings']> {
  const row = await tx.one<RegistrationSettingsRow>(
    'SELECT * FROM organization_registration_settings WHERE organization_id=$1',
    [org],
  );
  return {
    organizationId: org,
    invitationRequired: row?.invitation_required ?? true,
    revision: Number(row?.revision ?? 0),
    updatedAt: row?.updated_at.toISOString() ?? null,
  };
}
async function businessRole(tx: Sql, org: string, kind: 'viewer' | 'developer') {
  let role = await tx.one<{ id: string }>(
    'SELECT id FROM roles WHERE organization_id=$1 AND key=$2',
    [org, 'business_' + kind],
  );
  if (!role) {
    role = requireValue(
      await tx.one<{ id: string }>(
        'INSERT INTO roles(organization_id,key,name) VALUES($1,$2,$3) RETURNING id',
        [org, 'business_' + kind, kind === 'developer' ? '业务开发成员' : '业务只读成员'],
      ),
    );
    for (const action of businessActions[kind])
      await tx.exec(
        'INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,$3)',
        [org, role.id, action],
      );
  }
  const permissions = await tx.all<{ permission_key: string }>(
    'SELECT permission_key FROM role_permissions WHERE organization_id=$1 AND role_id=$2',
    [org, role.id],
  );
  if (
    permissions.length !== businessActions[kind].length ||
    permissions.some((p) => !businessActions[kind].includes(p.permission_key))
  )
    throw new Fault(
      409,
      'REGISTRATION_ROLE_INVALID',
      '注册角色的权限配置已变更，请联系管理员检查业务成员角色。',
    );
  return role.id;
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function registerAccounts(
  app: FastifyInstance,
  db: Database,
  identity: Identity,
  contract: Awaited<ReturnType<typeof contractValidation>>,
  config: PasswordAuthConfig | undefined,
  secret: string,
) {
  const mutations = new Mutations(db, identity);
  const enabled = () => {
    if (!config?.enabled) throw new Fault(503, 'PASSWORD_AUTH_DISABLED');
    return config;
  };
  async function throttle(key: string, max: number, seconds = 900) {
    const hash = createHmac('sha256', secret).update(key).digest('hex');
    const row = requireValue(
      await db.global.one<{ attempts: number }>(
        `INSERT INTO auth_rate_limits(bucket_hash) VALUES($1) ON CONFLICT(bucket_hash) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.window_started_at<now()-($2::int*interval '1 second') THEN 1 ELSE auth_rate_limits.attempts+1 END,window_started_at=CASE WHEN auth_rate_limits.window_started_at<now()-($2::int*interval '1 second') THEN now() ELSE auth_rate_limits.window_started_at END RETURNING attempts`,
        [hash, seconds],
      ),
    );
    if (row.attempts > max) throw new Fault(429, 'AUTH_RATE_LIMITED');
  }
  const audit = (tx: Sql, org: string, user: string, action: string, requestId: string) =>
    tx.exec(
      "INSERT INTO audit_logs(organization_id,actor_user_id,action,outcome,request_id) VALUES($1,$2,$3,'allow',$4)",
      [org, user, action, requestId],
    );
  async function browserSession(actor: Actor): Promise<S['BrowserSession']> {
    if (!actor.browserSession) throw new Fault(401, 'UNAUTHENTICATED');
    const account = requireValue(
      await db.global.one<{ must_change_password: boolean }>(
        'SELECT must_change_password FROM password_accounts WHERE user_id=$1',
        [actor.userId],
      ),
    );
    return {
      user: {
        id: actor.userId,
        displayName: actor.displayName,
        status: 'active',
        organizations: await identity.memberships(actor),
        organizationId: null,
        permissions: [],
        clientKind: 'human',
      },
      csrfToken: csrfToken(secret, actor.browserSession.id),
      mustChangePassword: account.must_change_password,
    };
  }
  async function issue(userId: string, key: string) {
    const value =
        'eas_browser_' +
        createHmac('sha256', secret)
          .update('browser-session:' + userId + ':' + key)
          .digest('base64url'),
      hash = tokenHash(value);
    const row = requireValue(
      await db.global.one<{
        id: string;
        revoked_at: Date | null;
        expires_at: Date;
        issued_at: Date;
      }>(
        "INSERT INTO auth_sessions(token_hash,user_id,client_kind,expires_at,auth_method) VALUES($1,$2,'human',now()+interval '8 hours','password') ON CONFLICT(token_hash) DO UPDATE SET token_hash=EXCLUDED.token_hash RETURNING id,revoked_at,expires_at,issued_at",
        [hash, userId],
      ),
    );
    if (row.revoked_at || row.expires_at.getTime() <= Date.now())
      throw new Fault(409, 'IDEMPOTENCY_CONFLICT');
    return { value, row };
  }
  for (const [method, path] of [
    ['GET', '/auth/options'],
    ['POST', '/auth/login'],
    ['POST', '/auth/register'],
    ['GET', '/auth/session'],
    ['POST', '/auth/logout'],
    ['POST', '/auth/password'],
    ['GET', '/registration-invitations'],
    ['POST', '/registration-invitations'],
    ['POST', '/registration-invitations/{invitationId}/revoke'],
    ['GET', '/registration-settings'],
    ['POST', '/registration-settings'],
  ] as const) {
    const operation = requireValue(contract.spec.paths[path]?.[method.toLowerCase()]);
    app.route({
      method,
      url: '/v1' + path.replace('{invitationId}', ':invitationId'),
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache');
        try {
          if (Object.keys(req.query as object).length) throw new Fault(400, 'VALIDATION_ERROR');
          contract.body(operation, req.body);
          const key = req.headers['idempotency-key'];
          if (method === 'POST' && (typeof key !== 'string' || !uuid.test(key)))
            throw new Fault(400, 'VALIDATION_ERROR');
          if (path === '/auth/options') {
            const organizations = config?.enabled
              ? await db.global.all<S['RegistrationOrganization']>(
                  'SELECT * FROM eas_open_registration_organizations()',
                )
              : [];
            return {
              passwordEnabled: config?.enabled ?? false,
              registration: organizations.length ? 'open' : 'invitation',
              minPasswordLength: 12,
              openOrganizations: organizations,
            } satisfies S['AuthOptions'];
          }
          const cfg = enabled();
          if (path === '/auth/login') {
            requireOrigin(req, cfg);
            const input = req.body as S['PasswordLogin'],
              username = input.username.toLowerCase();
            await throttle('login-ip:' + req.ip, 100);
            await throttle('login-user:' + username, 10);
            const account = await db.global.one<{
              user_id: string;
              password_hash: string;
              status: string;
              display_name: string;
            }>(
              'SELECT a.user_id,a.password_hash,u.status,u.display_name FROM password_accounts a JOIN users u ON u.id=a.user_id WHERE a.username=$1',
              [username],
            );
            const valid = await verifyPassword(input.password, account?.password_hash ?? null);
            if (!valid || !account || account.status !== 'active')
              throw new Fault(401, 'INVALID_CREDENTIALS');
            const actor: Actor = {
              userId: account.user_id,
              displayName: account.display_name,
              clientKind: 'human',
              authenticatedAt: Date.now(),
            };
            if (!(await identity.memberships(actor)).length)
              throw new Fault(401, 'INVALID_CREDENTIALS');
            const session = await issue(actor.userId, key as string);
            actor.browserSession = { id: session.row.id };
            actor.authMethod = 'password';
            actor.authenticatedAt = session.row.issued_at.getTime();
            for (const org of await identity.memberships(actor))
              await db.tenant(org.id, (tx) =>
                audit(tx, org.id, actor.userId, 'account.login', req.id),
              );
            reply.header('Set-Cookie', sessionCookie(session.value, cfg));
            return browserSession(actor);
          }
          if (path === '/auth/register') {
            requireOrigin(req, cfg);
            await throttle('registration-ip:' + req.ip, 10, 3600);
            const input = req.body as S['PasswordRegistration'];
            requirePassword(input.password);
            const username = input.username.toLowerCase();
            if (['admin', 'administrator', 'root', 'system', 'superadmin'].includes(username))
              throw new Fault(409, 'ACCOUNT_UNAVAILABLE');
            const hash = input.invitationCode ? tokenHash(input.invitationCode) : null,
              lookup = hash
                ? await db.global.one<{ org: string | null }>(
                    'SELECT eas_invitation_organization($1) org',
                    [hash],
                  )
                : { org: input.organizationId };
            if (!lookup?.org)
              throw new Fault(403, hash ? 'INVITATION_INVALID' : 'INVITATION_REQUIRED');
            const org = lookup.org;
            const passwordHash = await hashPassword(input.password);
            await db.tenant(org, async (tx) => {
              if (!(await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org])))
                throw new Fault(
                  403,
                  'INVITATION_REQUIRED',
                  '该组织当前不支持直接注册，请使用邀请码。',
                );
              let invite: InvitationRow | undefined, roleId: string;
              if (hash) {
                invite = await tx.one<InvitationRow>(
                  'SELECT * FROM organization_invitations WHERE organization_id=$1 AND token_hash=$2 AND revoked_at IS NULL AND used_at IS NULL AND expires_at>now() FOR UPDATE',
                  [org, hash],
                );
                if (!invite) throw new Fault(403, 'INVITATION_INVALID');
                try {
                  const issuer = await identity.subject(
                    tx,
                    {
                      userId: invite.created_by,
                      displayName: '',
                      clientKind: 'human',
                      authenticatedAt: 0,
                    },
                    org,
                  );
                  identity.require(issuer, 'account.manage');
                  for (const action of businessActions[invite.role_kind])
                    identity.require(issuer, action);
                } catch {
                  throw new Fault(403, 'INVITATION_INVALID');
                }
                const roleKind = invite.role_kind,
                  permissions = await tx.all<{ permission_key: string }>(
                    'SELECT permission_key FROM role_permissions WHERE organization_id=$1 AND role_id=$2',
                    [org, invite.role_id],
                  );
                if (
                  permissions.length !== businessActions[roleKind].length ||
                  permissions.some((p) => !businessActions[roleKind].includes(p.permission_key))
                )
                  throw new Fault(403, 'INVITATION_INVALID');
                roleId = invite.role_id;
              } else {
                if ((await registrationSettings(tx, org)).invitationRequired)
                  throw new Fault(
                    403,
                    'INVITATION_REQUIRED',
                    '当前组织已开启邀请码注册，请获取邀请码后重试。',
                  );
                roleId = await businessRole(tx, org, 'developer');
              }
              const user = requireValue(
                await tx.one<{ id: string }>(
                  "INSERT INTO users(oidc_issuer,oidc_subject,display_name,status) VALUES('password-account',gen_random_uuid()::text,$1,'active') RETURNING id",
                  [input.displayName.trim()],
                ),
              );
              await tx.exec(
                'INSERT INTO password_accounts(user_id,username,password_hash) VALUES($1,$2,$3)',
                [user.id, username, passwordHash],
              );
              await tx.exec(
                "INSERT INTO organization_members(organization_id,user_id,status) VALUES($1,$2,'active')",
                [org, user.id],
              );
              await tx.exec(
                'INSERT INTO role_bindings(organization_id,user_id,role_id) VALUES($1,$2,$3)',
                [org, user.id, roleId],
              );
              if (invite)
                await tx.exec(
                  'UPDATE organization_invitations SET used_by=$3,used_at=now() WHERE organization_id=$1 AND id=$2',
                  [org, invite.id, user.id],
                );
              await audit(tx, org, user.id, 'account.register', req.id);
            });
            return reply.code(201).send({ message: '注册成功，请使用新账号登录。' });
          }
          const actor = await identity.authenticate(req);
          if (path === '/auth/session') return browserSession(actor);
          if (path === '/auth/logout') {
            if (!actor.browserSession) throw new Fault(403, 'FORBIDDEN');
            await db.global.exec(
              'UPDATE auth_sessions SET revoked_at=coalesce(revoked_at,now()) WHERE id=$1 AND user_id=$2',
              [actor.browserSession.id, actor.userId],
            );
            for (const org of await identity.memberships(actor))
              await db.tenant(org.id, (tx) =>
                audit(tx, org.id, actor.userId, 'account.logout', req.id),
              );
            reply.header('Set-Cookie', sessionCookie('', cfg, true));
            return { message: '已退出登录。' };
          }
          if (path === '/auth/password') {
            if (!actor.browserSession) throw new Fault(403, 'FORBIDDEN');
            const input = req.body as S['PasswordChange'];
            requirePassword(input.newPassword);
            if (input.currentPassword === input.newPassword)
              throw new Fault(400, 'PASSWORD_POLICY');
            await throttle('password-change:' + actor.userId, 10);
            const account = requireValue(
              await db.global.one<{ password_hash: string }>(
                'SELECT password_hash FROM password_accounts WHERE user_id=$1',
                [actor.userId],
              ),
            );
            if (!(await verifyPassword(input.currentPassword, account.password_hash)))
              throw new Fault(401, 'INVALID_CREDENTIALS');
            const next = await hashPassword(input.newPassword);
            const client = await db.pool.connect();
            try {
              await client.query('BEGIN');
              const changed = await client.query(
                'UPDATE password_accounts SET password_hash=$3,must_change_password=false,password_changed_at=now() WHERE user_id=$1 AND password_hash=$2',
                [actor.userId, account.password_hash, next],
              );
              if (changed.rowCount !== 1) throw new Fault(409, 'STATE_CONFLICT');
              await client.query(
                "UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND auth_method='password' AND revoked_at IS NULL",
                [actor.userId],
              );
              await client.query('COMMIT');
            } catch (e) {
              await client.query('ROLLBACK');
              throw e;
            } finally {
              client.release();
            }
            const session = await issue(actor.userId, key as string);
            reply.header('Set-Cookie', sessionCookie(session.value, cfg));
            return browserSession({ ...actor, browserSession: { id: session.row.id } });
          }
          const org = req.headers['x-organization-id'],
            id = (req.params as { invitationId?: string }).invitationId;
          if (typeof org !== 'string' || !uuid.test(org) || (id && !uuid.test(id)))
            throw new Fault(400, 'VALIDATION_ERROR');
          if (path === '/registration-settings') {
            if (method === 'GET')
              return await db.tenant(org, async (tx) => {
                const subject = await identity.subject(tx, actor, org);
                identity.require(subject, 'account.manage', true);
                return registrationSettings(tx, org);
              });
            const result = await mutations.run(
              req,
              actor,
              org,
              operation.operationId,
              'account.manage',
              true,
              async (tx, subject) => {
                const input = req.body as S['UpdateRegistrationSettings'],
                  current = await registrationSettings(tx, org);
                if (input.expectedRevision !== current.revision)
                  throw new Fault(
                    409,
                    'REGISTRATION_SETTINGS_CHANGED',
                    '注册设置已被更新，请刷新后重新保存。',
                  );
                if (!input.invitationRequired) {
                  for (const permission of businessActions.developer)
                    identity.require(subject, permission);
                  await businessRole(tx, org, 'developer');
                }
                await tx.exec(
                  'INSERT INTO organization_registration_settings(organization_id,invitation_required,updated_by) VALUES($1,$2,$3) ON CONFLICT(organization_id) DO UPDATE SET invitation_required=EXCLUDED.invitation_required,revision=organization_registration_settings.revision+1,updated_by=EXCLUDED.updated_by,updated_at=now()',
                  [org, input.invitationRequired, subject.userId],
                );
                return { body: await registrationSettings(tx, org), status: 200 };
              },
            );
            return reply.send(result.body);
          }
          const value = await db.tenant(org, async (tx) => {
            const subject = await identity.subject(tx, actor, org);
            identity.require(subject, 'account.manage', true);
            if (method === 'GET')
              return {
                items: (
                  await tx.all<InvitationRow>(
                    'SELECT * FROM organization_invitations WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',
                    [org],
                  )
                ).map(invitationDto),
                nextCursor: null,
              };
            if (id) {
              const row = requireValue(
                await tx.one<InvitationRow>(
                  'UPDATE organization_invitations SET revoked_at=coalesce(revoked_at,now()) WHERE organization_id=$1 AND id=$2 RETURNING *',
                  [org, id],
                ),
              );
              await audit(tx, org, subject.userId, 'invitation.revoke', req.id);
              return invitationDto(row);
            }
            const input = req.body as S['CreateRegistrationInvitation'];
            for (const permission of businessActions[input.role])
              identity.require(subject, permission);
            await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [org]);
            if (
              await tx.one(
                'SELECT id FROM organization_invitations WHERE organization_id=$1 AND created_by=$2 AND request_key=$3',
                [org, subject.userId, key],
              )
            )
              throw new Fault(409, 'IDEMPOTENCY_CONFLICT');
            const count = requireValue(
              await tx.one<{ n: number }>(
                'SELECT count(*)::int n FROM organization_invitations WHERE organization_id=$1 AND revoked_at IS NULL AND used_at IS NULL AND expires_at>now()',
                [org],
              ),
            );
            if (count.n >= 20) throw new Fault(429, 'AUTH_RATE_LIMITED');
            const roleId = await businessRole(tx, org, input.role);
            const code = 'eas_inv_' + randomBytes(32).toString('base64url'),
              row = requireValue(
                await tx.one<InvitationRow>(
                  "INSERT INTO organization_invitations(organization_id,token_hash,label,role_kind,request_key,role_id,created_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+($8::int*interval '1 day')) RETURNING *",
                  [
                    org,
                    tokenHash(code),
                    input.label,
                    input.role,
                    key,
                    roleId,
                    subject.userId,
                    input.expiresInDays,
                  ],
                ),
              );
            await audit(tx, org, subject.userId, 'invitation.create', req.id);
            return { code, invitation: invitationDto(row) };
          });
          return reply.code(method === 'POST' && !id ? 201 : 200).send(value);
        } catch (error) {
          const code = (error as { code?: string }).code,
            f =
              error instanceof Fault
                ? error
                : code === '23505'
                  ? new Fault(409, 'ACCOUNT_UNAVAILABLE')
                  : new Fault(503, 'DEPENDENCY_UNAVAILABLE');
          return reply.code(f.status).send({
            error: {
              code: f.code,
              message: f.safeMessage,
              ...(f.details.length ? { details: f.details } : {}),
              requestId: req.id,
            },
          });
        }
      },
    });
  }
}
