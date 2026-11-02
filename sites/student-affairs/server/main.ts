import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { Ajv, type ValidateFunction } from 'ajv';
import spec from './api-contract.json' with { type: 'json' };
import type { components } from '../shared/contracts.js';
import { profileFields } from '../shared/student-model.js';
import { Database } from './database.js';
import { Fault, invalidParameters } from './errors.js';
import { StudentCenterService } from './service.js';
import { StudentAccounts } from './accounts.js';
type S = components['schemas'];
interface RuntimeConfig {
  organizationId: string;
  appId: string;
  versionId: string;
  databaseUrl: string;
  csrfKey: string;
  origin: string;
  port: number;
}
async function main() {
  const config = JSON.parse(await readFile('/app/runtime.json', 'utf8')) as RuntimeConfig,
    db = new Database(config.databaseUrl),
    app = Fastify({ logger: false, bodyLimit: 40 * 1024 * 1024 });
  const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
  ajv.addFormat('uuid', /^[a-f\d-]{36}$/i);
  ajv.addFormat('date-time', (value) => Number.isFinite(Date.parse(value)));
  // The site owns its field model; adding a field here no longer changes the AI platform.
  const schema = structuredClone(spec);
  for (const key of profileFields)
    (schema.components.schemas.StudentProfile.properties as Record<string, unknown>)[key] = {
      type: 'string',
      maxLength: 500,
    };
  (
    schema.components.schemas.StudentProfile as { additionalProperties: unknown }
  ).additionalProperties = false;
  ajv.addSchema(schema, 'student-app');
  const validators = new Map<string, ValidateFunction>();
  const validate = (name: string, value: unknown) => {
    let fn = validators.get(name);
    if (!fn) {
      fn = ajv.compile({ $ref: 'student-app#/components/schemas/' + name });
      validators.set(name, fn);
    }
    return { ok: fn(value), fn };
  };
  const service = new StudentCenterService(
      (value) => validate('StudentRichDocument', value).ok === true,
    ),
    accounts = new StudentAccounts(config.csrfKey, [config.origin], true);
  app.get('/healthz', async () => {
    await db.global.one('SELECT 1');
    return { status: 'ok', service: 'student-affairs', versionId: config.versionId };
  });
  app.post('/actions', async (req, reply) => {
    const traceId = randomUUID();
    reply.header('Cache-Control', 'no-store');
    try {
      const validation = validate('StudentCenterRequest', req.body);
      if (!validation.ok) throw invalidParameters(validation.fn.errors);
      const b = req.body as S['StudentCenterRequest'],
        org = config.organizationId,
        appId = config.appId;
      const result = await db.tenant(org, async (tx) => {
        const session = (r: {
          user: S['StudentCenterMember'] | null;
          departmentName: string;
          csrfToken: string | null;
        }) => {
          if (r.csrfToken) reply.header('X-Student-CSRF', r.csrfToken);
          return { user: r.user, departmentName: r.departmentName };
        };
        if (b.action === 'auth.session')
          return session(await accounts.session(tx, req, org, appId));
        if (b.action === 'auth.login')
          return session(await accounts.login(tx, req, reply, org, appId, b.payload));
        const actor = await accounts.actor(tx, req, org, appId, true);
        if (!actor) throw new Fault(401, 'STUDENT_LOGIN_REQUIRED', '请先登录学生事务中心。');
        if (b.action === 'auth.logout')
          return session(await accounts.logout(tx, req, reply, org, appId));
        const admin = [
          'templates.save',
          'templates.upload',
          'templates.delete',
          'templates.import',
          'templates.export',
          'settings.save',
          'members.list',
          'members.save',
          'students.archive',
        ].includes(b.action);
        await service.authorize(tx, actor, appId, config.versionId, admin);
        const read =
          [
            'bootstrap',
            'students.search',
            'templates.file',
            'templates.import',
            'templates.export',
            'certificates.search',
            'certificates.get',
            'certificates.preview',
            'members.list',
          ].includes(b.action) ||
          (b.action === 'students.import' && b.payload.mode === 'preview');
        if (!read)
          await tx.one(
            'SELECT app_id FROM student_center_settings WHERE organization_id=$1 AND app_id=$2 FOR UPDATE',
            [org, appId],
          );
        const key = req.headers['idempotency-key'];
        if (typeof key !== 'string' || !/^[a-f\d-]{36}$/i.test(key))
          throw new Fault(400, 'VALIDATION_ERROR', '请求缺少操作编号。');
        const digest = createHash('sha256').update(JSON.stringify(b)).digest('hex');
        if (!read) {
          const old = await tx.one<{ request_hash: string; response: unknown }>(
            'SELECT request_hash,response FROM student_center_idempotency WHERE organization_id=$1 AND app_id=$2 AND user_id=$3 AND key=$4',
            [org, appId, actor.userId, key],
          );
          if (old) {
            if (old.request_hash !== digest)
              throw new Fault(409, 'IDEMPOTENCY_CONFLICT', '同一操作编号的内容不一致。');
            return old.response;
          }
        }
        const value =
          b.action === 'auth.password'
            ? await accounts.changePassword(tx, req, appId, actor, b.payload)
            : await service.execute(tx, actor, appId, b);
        await tx.exec(
          'INSERT INTO site_audit_events(action,user_id,version_id,request_id,trace_id) VALUES($1,$2,$3,$4,$5)',
          [b.action, actor.userId, config.versionId, req.id, traceId],
        );
        if (!read)
          await tx.exec(
            'INSERT INTO student_center_idempotency(organization_id,app_id,user_id,key,request_hash,response) VALUES($1,$2,$3,$4,$5,$6)',
            [org, appId, actor.userId, key, digest, JSON.stringify(value)],
          );
        return value;
      });
      return reply.send({ action: b.action, result });
    } catch (e) {
      const f =
        e instanceof Fault
          ? e
          : (e as { code?: string }).code === '23505'
            ? new Fault(409, 'STUDENT_ACCOUNT_EXISTS', '账号或学号已存在。')
            : new Fault(
                503,
                'STUDENT_SERVICE_UNAVAILABLE',
                '学生事务后端未完成此操作，请稍后重试或查看站点日志。',
              );
      return reply.code(f.status).send({
        error: { code: f.code, message: f.safeMessage, details: f.details, requestId: req.id },
        traceId,
      });
    }
  });
  app.addHook('onClose', () => db.close());
  await app.listen({ port: config.port, host: '0.0.0.0' });
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
      void app.close();
    });
}
void main().catch(() => {
  console.error('STUDENT_BACKEND_START_FAILED');
  process.exitCode = 1;
});
