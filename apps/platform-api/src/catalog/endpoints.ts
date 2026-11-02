import { isIP, BlockList } from 'node:net';
import type { Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Subject } from '../identity/identity.js';
import { endpointDto, type EndpointRow, type S } from './models.js';
const blocked = new BlockList();
for (const [address, bits] of [
  ['0.0.0.0', 8],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(address, bits, 'ipv4');
const validAddress = (address: string) => isIP(address) === 4 && !blocked.check(address, 'ipv4');
/** Registration is a human administrator decision; it performs no DNS, TCP or database probe. */
export async function createEndpoint(
  tx: Sql,
  s: Subject,
  b: S['CreateNetworkEndpoint'],
  localFixture = false,
): Promise<S['CreatedNetworkEndpoint']> {
  const valid = (address: string) =>
    validAddress(address) || (localFixture && b.environment === 'test' && address === '127.0.0.1');
  const host = b.host.toLowerCase();
  if (
    !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) ||
    host.includes('..') ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    (isIP(host) !== 0 && !valid(host)) ||
    (/^\d+\./.test(host) && isIP(host) !== 4)
  )
    throw new Fault(422, 'NETWORK_ADDRESS_FORBIDDEN');
  if (
    new Set(b.allowedAddresses).size !== b.allowedAddresses.length ||
    b.allowedAddresses.some((a) => !valid(a)) ||
    (isIP(host) && !b.allowedAddresses.includes(host))
  )
    throw new Fault(422, 'NETWORK_ADDRESS_FORBIDDEN');
  if (
    !/^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(b.tlsServerName) ||
    b.tlsServerName.includes('..') ||
    b.allowedDatabases.some((v) => !v.trim() || v.includes('\0')) ||
    new Set(b.allowedDatabases).size !== b.allowedDatabases.length ||
    b.allowedRelations.some(
      (r) => !r.schema.trim() || !r.name.trim() || r.schema.includes('\0') || r.name.includes('\0'),
    ) ||
    new Set(b.allowedRelations.map((r) => r.schema + '\0' + r.name)).size !==
      b.allowedRelations.length
  )
    throw new Fault(422, 'VALIDATION_ERROR');
  if (b.caRef && (!/^[-a-zA-Z0-9_/]+$/.test(b.caRef) || b.caRef.includes('..')))
    throw new Fault(422, 'VALIDATION_ERROR');
  const profile = b.credentialProfileId
    ? requireValue(
        await tx.one<{ label: string; environment: string; engine: string; secret_ref: string }>(
          'SELECT label,environment,engine,secret_ref FROM credential_profiles WHERE organization_id=$1 AND id=$2',
          [s.organizationId, b.credentialProfileId],
        ),
      )
    : undefined;
  if (
    profile &&
    (profile.environment !== b.environment ||
      profile.engine !== b.engine ||
      profile.secret_ref.startsWith('local:'))
  )
    throw new Fault(422, 'ENVIRONMENT_FORBIDDEN');
  const row = requireValue(
    await tx.one<EndpointRow>(
      `INSERT INTO network_endpoints(organization_id,name,environment,engine,host,port,allowed_cidrs,tls_server_name,allowed_databases,allowed_relations,ca_ref,tls_mode,local_fixture) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        s.organizationId,
        b.name,
        b.environment,
        b.engine,
        host,
        b.port,
        b.allowedAddresses.map((a) => a + '/32'),
        b.tlsServerName,
        b.allowedDatabases,
        JSON.stringify(b.allowedRelations),
        b.caRef ?? null,
        localFixture ? 'disable-fixture' : 'verify-full',
        localFixture,
      ],
    ),
  );
  let credentialProfile: S['CredentialProfile'] | null = null;
  if (profile) {
    const p = requireValue(
      await tx.one<{ id: string }>(
        `INSERT INTO credential_profiles(organization_id,label,environment,engine,secret_ref,allowed_endpoint_ids) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          s.organizationId,
          (profile.label + ' · ' + b.name).slice(0, 100) + ' ' + row.id.slice(0, 8),
          b.environment,
          b.engine,
          profile.secret_ref,
          [row.id],
        ],
      ),
    );
    credentialProfile = {
      id: p.id,
      label: (profile.label + ' · ' + b.name).slice(0, 100) + ' ' + row.id.slice(0, 8),
      environment: b.environment,
      engine: b.engine,
      endpointIds: [row.id],
    };
  }
  return { endpoint: endpointDto(row), credentialProfile };
}
