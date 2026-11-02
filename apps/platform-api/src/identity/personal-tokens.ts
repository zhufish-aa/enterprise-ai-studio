import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { components } from '@eas/api-contract';
import type { Database, Sql } from '../infrastructure/database.js';
import type { Identity, Subject } from './identity.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { contractValidation } from '../infrastructure/contract-validation.js';
type S = components['schemas'];
interface Row {
  id: string;
  name: string;
  scope: 'read' | 'develop';
  token_hint: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}
const dto = (r: Row): S['PersonalToken'] => ({
  id: r.id,
  name: r.name,
  scope: r.scope,
  hint: '…' + r.token_hint,
  createdAt: r.created_at.toISOString(),
  expiresAt: r.expires_at.toISOString(),
  revokedAt: r.revoked_at?.toISOString() ?? null,
});
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function registerPersonalTokens(
  app: FastifyInstance,
  db: Database,
  identity: Identity,
  contract: Awaited<ReturnType<typeof contractValidation>>,
) {
  const audit = (tx: Sql, s: Subject, action: string, id: string, requestId: string) =>
    tx.exec(
      "INSERT INTO audit_logs(organization_id,actor_user_id,action,outcome,resource_id,request_id) VALUES($1,$2,$3,'allow',$4,$5)",
      [s.organizationId, s.userId, action, id, requestId],
    );
  for (const [method, path] of [
    ['GET', '/me/tokens'],
    ['POST', '/me/tokens'],
    ['POST', '/me/tokens/{tokenId}/revoke'],
  ] as const) {
    const operation = requireValue(contract.spec.paths[path]?.[method.toLowerCase()]);
    app.route({
      method,
      url: '/v1' + path.replace('{tokenId}', ':tokenId'),
      handler: async (req, reply) => {
        reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache');
        try {
          const actor = await identity.authenticate(req),
            org = req.headers['x-organization-id'],
            params = req.params as { tokenId?: string };
          if (
            typeof org !== 'string' ||
            !uuid.test(org) ||
            (params.tokenId && !uuid.test(params.tokenId)) ||
            Object.keys(req.query as object).length
          )
            throw new Fault(400, 'VALIDATION_ERROR');
          contract.body(operation, req.body);
          const requestKey = req.headers['idempotency-key'];
          if (method === 'POST' && (typeof requestKey !== 'string' || !uuid.test(requestKey)))
            throw new Fault(400, 'VALIDATION_ERROR');
          const result = await db.tenant(org, async (tx) => {
            const s = await identity.subject(tx, actor, org);
            identity.require(s, 'session.read', true);
            if (method === 'GET')
              return {
                items: (
                  await tx.all<Row>(
                    'SELECT id,name,scope,token_hint,created_at,expires_at,revoked_at FROM personal_access_tokens WHERE organization_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 100',
                    [org, s.userId],
                  )
                ).map(dto),
                nextCursor: null,
              };
            // Serializes issuance/revocation for an owner without storing a response secret in idempotency_records.
            await tx.exec('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
              org + ':tokens:' + s.userId,
            ]);
            if (params.tokenId) {
              const row = requireValue(
                await tx.one<Row>(
                  'UPDATE personal_access_tokens SET revoked_at=coalesce(revoked_at,now()) WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING *',
                  [org, s.userId, params.tokenId],
                ),
              );
              await audit(tx, s, 'personalToken.revoke', row.id, req.id);
              return dto(row);
            }
            const input = req.body as S['CreatePersonalToken'];
            if (input.scope === 'develop') identity.require(s, 'app.develop');
            const prior = await tx.one(
              'SELECT id FROM personal_access_tokens WHERE organization_id=$1 AND user_id=$2 AND request_key=$3',
              [org, s.userId, requestKey],
            );
            if (prior)
              throw new Fault(
                409,
                'TOKEN_ALREADY_ISSUED',
                'The credential was already issued; create a new request.',
              );
            const count = requireValue(
              await tx.one<{ active: number; recent: number }>(
                "SELECT count(*) FILTER(WHERE revoked_at IS NULL AND expires_at>now())::int active,count(*) FILTER(WHERE created_at>now()-interval '1 day')::int recent FROM personal_access_tokens WHERE organization_id=$1 AND user_id=$2",
                [org, s.userId],
              ),
            );
            if (count.active >= 20 || count.recent >= 50)
              throw new Fault(429, 'TOKEN_LIMIT_REACHED');
            const token = 'eas_pat_' + randomBytes(32).toString('base64url'),
              hash = createHash('sha256').update(token).digest('hex');
            const row = requireValue(
              await tx.one<Row>(
                "INSERT INTO personal_access_tokens(organization_id,user_id,name,token_hash,token_hint,scope,request_key,request_digest,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+($9::int*interval '1 day')) RETURNING *",
                [
                  org,
                  s.userId,
                  input.name,
                  hash,
                  token.slice(-8),
                  input.scope,
                  requestKey,
                  createHash('sha256').update(JSON.stringify(input)).digest('hex'),
                  input.expiresInDays,
                ],
              ),
            );
            await audit(tx, s, 'personalToken.create', row.id, req.id);
            return { token, metadata: dto(row) };
          });
          return reply.code(method === 'POST' && !params.tokenId ? 201 : 200).send(result);
        } catch (e) {
          const f = e instanceof Fault ? e : new Fault(503, 'DEPENDENCY_UNAVAILABLE');
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
