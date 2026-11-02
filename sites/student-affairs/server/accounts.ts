import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { components } from '../shared/contracts.js';
import type { Sql } from './database.js';
import { Fault } from './errors.js';
type S = components['schemas'];
export interface StudentActor {
  organizationId: string;
  userId: string;
  displayName: string;
  username: string;
  role: 'administrator' | 'staff';
}
async function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, key) =>
      e
        ? reject(new Fault(503, 'STUDENT_SERVICE_UNAVAILABLE', '密码服务暂时不可用，请稍后重试。'))
        : resolve(key),
    ),
  );
}
export async function studentPasswordHash(password: string) {
  if (!password || password.length > 128)
    throw new Fault(400, 'STUDENT_FIELD_INVALID', '请填写密码（不超过 128 个字符）。');
  const salt = randomBytes(24),
    key = await derive(password, salt);
  return salt.toString('hex') + ':' + key.toString('hex');
}
async function verify(password: string, encoded: string | null) {
  const [salt, hash] = (encoded ?? '0'.repeat(48) + ':' + '0'.repeat(64)).split(':');
  if (!salt || !hash) throw new Fault(503, 'STUDENT_SERVICE_UNAVAILABLE');
  const key = await derive(password, Buffer.from(salt, 'hex'));
  return timingSafeEqual(key, Buffer.from(hash, 'hex')) && encoded !== null;
}
const tokenHash = (s: string) => createHash('sha256').update(s).digest('hex');
export class StudentAccounts {
  constructor(
    private readonly csrfKey: string,
    private readonly origins: readonly string[],
    private readonly secure: boolean,
  ) {}
  private name(appId: string) {
    return 'eas_sc_' + appId.replaceAll('-', '');
  }
  private token(req: FastifyRequest, appId: string) {
    const raw = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(this.name(appId) + '='))
      ?.slice(this.name(appId).length + 1);
    return raw && /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null;
  }
  private csrf(token: string, appId: string) {
    return createHmac('sha256', this.csrfKey)
      .update('student-center:' + appId + ':' + tokenHash(token))
      .digest('hex');
  }
  origin(req: FastifyRequest) {
    const origin = req.headers.origin;
    if (typeof origin !== 'string' || !this.origins.includes(origin))
      throw new Fault(403, 'CSRF_REJECTED', '请从站点页面提交操作。');
  }
  async actor(
    tx: Sql,
    req: FastifyRequest,
    org: string,
    appId: string,
    write = false,
  ): Promise<StudentActor | null> {
    const token = this.token(req, appId);
    if (!token) return null;
    const row = await tx.one<{
      id: string;
      display_name: string;
      username: string;
      role: 'administrator' | 'staff';
    }>(
      `SELECT a.id,a.display_name,a.username,m.role FROM student_center_sessions s JOIN student_center_accounts a ON a.organization_id=s.organization_id AND a.app_id=s.app_id AND a.id=s.user_id JOIN student_center_members m ON m.organization_id=a.organization_id AND m.app_id=a.app_id AND m.user_id=a.id WHERE s.token_hash=$1 AND s.organization_id=$2 AND s.app_id=$3 AND s.expires_at>now() AND s.revoked_at IS NULL AND a.active`,
      [tokenHash(token), org, appId],
    );
    if (!row) return null;
    if (write) {
      this.origin(req);
      const supplied = req.headers['x-student-csrf'],
        expected = this.csrf(token, appId);
      if (
        typeof supplied !== 'string' ||
        supplied.length !== expected.length ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
      )
        throw new Fault(403, 'CSRF_REJECTED', '会话已更新，请刷新站点后重试。');
    }
    return {
      organizationId: org,
      userId: row.id,
      displayName: row.display_name,
      username: row.username,
      role: row.role,
    };
  }
  async session(tx: Sql, req: FastifyRequest, org: string, appId: string) {
    const actor = await this.actor(tx, req, org, appId),
      settings = await tx.one<{ department_name: string }>(
        'SELECT department_name FROM student_center_settings WHERE organization_id=$1 AND app_id=$2',
        [org, appId],
      ),
      token = this.token(req, appId);
    return {
      user: actor
        ? {
            userId: actor.userId,
            name: actor.displayName,
            username: actor.username,
            role: actor.role,
          }
        : null,
      departmentName: settings?.department_name ?? '学生事务中心',
      csrfToken: actor && token ? this.csrf(token, appId) : null,
    };
  }
  async login(
    tx: Sql,
    req: FastifyRequest,
    reply: FastifyReply,
    org: string,
    appId: string,
    b: S['StudentCenterLogin'],
  ) {
    this.origin(req);
    const row = await tx.one<{ id: string; password_hash: string }>(
      'SELECT id,password_hash FROM student_center_accounts WHERE organization_id=$1 AND app_id=$2 AND username=$3 AND active',
      [org, appId, b.username.trim().toLowerCase()],
    );
    if (!(await verify(b.password, row?.password_hash ?? null)) || !row)
      throw new Fault(401, 'STUDENT_INVALID_CREDENTIALS', '账号或密码错误，请重新输入。');
    const token = randomBytes(32).toString('base64url');
    await tx.exec(
      'INSERT INTO student_center_sessions(token_hash,organization_id,app_id,user_id) VALUES($1,$2,$3,$4)',
      [tokenHash(token), org, appId, row.id],
    );
    reply.header(
      'Set-Cookie',
      this.name(appId) +
        '=' +
        token +
        '; Path=/v1/student-centers/' +
        appId +
        '; HttpOnly; SameSite=Strict; Max-Age=604800' +
        (this.secure ? '; Secure' : ''),
    );
    const changed = {
      ...req,
      headers: { ...req.headers, cookie: this.name(appId) + '=' + token },
    } as FastifyRequest;
    return this.session(tx, changed, org, appId);
  }
  async logout(tx: Sql, req: FastifyRequest, reply: FastifyReply, org: string, appId: string) {
    const token = this.token(req, appId);
    if (token)
      await tx.exec(
        'UPDATE student_center_sessions SET revoked_at=now() WHERE token_hash=$1 AND organization_id=$2 AND app_id=$3',
        [tokenHash(token), org, appId],
      );
    reply.header(
      'Set-Cookie',
      this.name(appId) +
        '=; Path=/v1/student-centers/' +
        appId +
        '; HttpOnly; SameSite=Strict; Max-Age=0' +
        (this.secure ? '; Secure' : ''),
    );
    const settings = await tx.one<{ department_name: string }>(
      'SELECT department_name FROM student_center_settings WHERE organization_id=$1 AND app_id=$2',
      [org, appId],
    );
    return {
      user: null,
      departmentName: settings?.department_name ?? '学生事务中心',
      csrfToken: null,
    };
  }
  async changePassword(
    tx: Sql,
    req: FastifyRequest,
    appId: string,
    actor: StudentActor,
    b: S['StudentCenterPassword'],
  ) {
    const row = await tx.one<{ password_hash: string }>(
      'SELECT password_hash FROM student_center_accounts WHERE organization_id=$1 AND app_id=$2 AND id=$3',
      [actor.organizationId, appId, actor.userId],
    );
    if (!row || !(await verify(b.currentPassword, row.password_hash)))
      throw new Fault(401, 'STUDENT_INVALID_CREDENTIALS', '当前密码错误，请重新输入。');
    await tx.exec(
      'UPDATE student_center_accounts SET password_hash=$4 WHERE organization_id=$1 AND app_id=$2 AND id=$3',
      [actor.organizationId, appId, actor.userId, await studentPasswordHash(b.password)],
    );
    await tx.exec(
      'UPDATE student_center_sessions SET revoked_at=now() WHERE organization_id=$1 AND app_id=$2 AND user_id=$3 AND token_hash<>$4',
      [actor.organizationId, appId, actor.userId, tokenHash(this.token(req, appId) ?? '')],
    );
    return { changed: true };
  }
}
