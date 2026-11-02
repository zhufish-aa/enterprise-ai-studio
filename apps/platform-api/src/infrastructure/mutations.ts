import { digest, canonical } from '@eas/connector-transport';
import type { FastifyRequest } from 'fastify';
import type { Database, Sql } from './database.js';
import type { Actor, Subject, Identity } from '../identity/identity.js';
import { Fault } from './errors.js';
export interface Result {
  body: unknown;
  status?: number;
  etag?: string;
}
export function ifMatch(req: FastifyRequest, revision: number): void {
  const value = req.headers['if-match'];
  if (typeof value !== 'string') throw new Fault(428, 'PRECONDITION_REQUIRED');
  if (value !== '"' + revision + '"') throw new Fault(412, 'REVISION_MISMATCH');
}
export class Mutations {
  constructor(
    private readonly db: Database,
    private readonly identity: Identity,
  ) {}
  async run(
    req: FastifyRequest,
    actor: Actor,
    organizationId: string,
    operation: string,
    permission: string,
    human: boolean,
    fn: (tx: Sql, subject: Subject) => Promise<Result>,
    revalidate?: (tx: Sql, subject: Subject) => Promise<void>,
  ): Promise<Result> {
    const key = req.headers['idempotency-key'];
    if (
      typeof key !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)
    )
      throw new Fault(400, 'VALIDATION_ERROR');
    return this.db.tenant(organizationId, async (tx) => {
      await tx.one('SELECT id FROM organizations WHERE id=$1 FOR UPDATE', [organizationId]);
      const subject = await this.identity.subject(tx, actor, organizationId);
      this.identity.require(subject, permission, human);
      if (revalidate) await revalidate(tx, subject);
      const hash = digest({
        method: req.method,
        url: req.url,
        body: req.body ?? null,
        ifMatch: req.headers['if-match'] ?? null,
      });
      const previous = await tx.one<{
        request_hash: string;
        response_body: Result;
        status: string;
      }>(
        `SELECT request_hash,response_body,status FROM idempotency_records WHERE organization_id=$1 AND user_id=$2 AND operation_id=$3 AND key=$4 AND expires_at>now()`,
        [organizationId, actor.userId, operation, key],
      );
      if (previous) {
        if (previous.request_hash !== hash) throw new Fault(409, 'IDEMPOTENCY_CONFLICT');
        if (previous.status !== 'completed') throw new Fault(409, 'STATE_CONFLICT');
        return previous.response_body;
      }
      const result = await fn(tx, subject);
      await tx.exec(
        `INSERT INTO idempotency_records(organization_id,user_id,operation_id,key,request_hash,status,response_status,response_body,expires_at) VALUES($1,$2,$3,$4,$5,'completed',$6,$7,now()+interval '24 hours') ON CONFLICT(organization_id,user_id,operation_id,key) DO UPDATE SET request_hash=EXCLUDED.request_hash,status=EXCLUDED.status,response_status=EXCLUDED.response_status,response_body=EXCLUDED.response_body,expires_at=EXCLUDED.expires_at WHERE idempotency_records.expires_at<=now()`,
        [
          organizationId,
          actor.userId,
          operation,
          key,
          hash,
          result.status ?? 200,
          canonical(result),
        ],
      );
      await tx.exec(
        `INSERT INTO audit_logs(organization_id,actor_user_id,action,outcome,request_id) VALUES($1,$2,$3,'allow',$4)`,
        [organizationId, actor.userId, operation, req.id],
      );
      await tx.exec(
        `INSERT INTO outbox_events(organization_id,aggregate_type,aggregate_id,event_type,payload) VALUES($1,'catalog',$2,$3,$4)`,
        [organizationId, organizationId, operation, JSON.stringify({ requestId: req.id })],
      );
      return result;
    });
  }
}
