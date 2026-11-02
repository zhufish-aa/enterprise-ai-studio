import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { SiteDataSourceInput } from '@eas/api-contract';
import type { Database } from '../infrastructure/database.js';
import type { Identity, Subject } from '../identity/identity.js';
import { Fault } from '../infrastructure/errors.js';
import { createEndpoint } from './endpoints.js';

/** Site-owned credentials do not bypass the existing environment and network registration rules. */
export async function authorizeSiteDataSource(
  db: Database,
  identity: Identity,
  subject: Subject,
  input: SiteDataSourceInput,
) {
  const host = input.host?.toLowerCase() === 'localhost' ? '127.0.0.1' : input.host?.toLowerCase();
  if (!host || !input.database) throw new Fault(422, 'VALIDATION_ERROR');
  const addresses = isIP(host)
    ? [host]
    : [...new Set((await lookup(host, { all: true, family: 4 })).map((r) => r.address))];
  if (!addresses.length || addresses.some((ip) => isIP(ip) !== 4))
    throw new Fault(422, 'NETWORK_ADDRESS_FORBIDDEN');
  const local = host === '127.0.0.1';
  if (input.tls === false && !local)
    throw new Fault(
      422,
      'SITE_DATABASE_TLS_REQUIRED',
      '外部数据库连接需要验证 TLS 证书；只有本机 TEST 数据库可以关闭 TLS。',
    );
  await db.tenant(subject.organizationId, async (tx) => {
    const current = await identity.subject(tx, subject, subject.organizationId);
    identity.require(current, 'connection.manage', true);
    identity.require(current, 'network.manage', true);
    const production = await tx.one(
      "SELECT id FROM network_endpoints WHERE organization_id=$1 AND environment='production' AND port=$2 AND (host=$3 OR EXISTS(SELECT 1 FROM unnest(allowed_cidrs) cidr WHERE $4::inet <<= cidr::cidr)) LIMIT 1",
      [current.organizationId, input.port ?? 5432, host, addresses[0]],
    );
    if (production)
      throw new Fault(
        403,
        'PRODUCTION_AUTHORIZATION_REQUIRED',
        '此地址已登记为生产数据源，不能接入未审批的 TEST 站点。',
      );
    await createEndpoint(
      tx,
      current,
      {
        name: input.name,
        environment: 'test',
        engine: 'postgresql',
        host,
        port: input.port ?? 5432,
        allowedAddresses: addresses,
        tlsServerName: host,
        allowedDatabases: [input.database!],
        allowedRelations: [],
      },
      local,
    );
  });
  return { ...input, host, allowedAddresses: addresses };
}
