import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { ManagedSecrets, type ManagedSecretConfig } from '@eas/connector-transport';
import type { Sql } from '../infrastructure/database.js';
import { Fault, requireValue } from '../infrastructure/errors.js';
import type { Subject, Identity } from '../identity/identity.js';
import type { S } from './models.js';
import type { CatalogService } from './service.js';
import { createEndpoint } from './endpoints.js';
export async function configureConnection(
  tx: Sql,
  s: Subject,
  b: S['ConfigurePhysicalConnection'],
  identity: Identity,
  service: CatalogService,
  stores: Partial<Record<'test' | 'production', ManagedSecretConfig>> | undefined,
  allowLocal: boolean,
) {
  identity.require(s, 'connection.manage', true);
  const config = stores?.[b.environment];
  if (!config) throw new Fault(503, 'CREDENTIAL_STORE_UNAVAILABLE');
  if (b.username.includes('\0') || b.password.includes('\0'))
    throw new Fault(422, 'VALIDATION_ERROR');
  const host = b.host.toLowerCase() === 'localhost' ? '127.0.0.1' : b.host.toLowerCase();
  if (
    !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) ||
    host.includes('..') ||
    (/^\d+\./.test(host) && isIP(host) !== 4)
  )
    throw new Fault(422, 'NETWORK_ADDRESS_FORBIDDEN');
  let addresses: string[];
  try {
    addresses = isIP(host)
      ? [host]
      : [
          ...new Set(
            (
              await Promise.race([
                lookup(host, { all: true, family: 4 }),
                new Promise<never>((_, reject) => {
                  const timer = setTimeout(() => reject(new Error()), 2000);
                  timer.unref();
                }),
              ])
            ).map((r) => r.address),
          ),
        ];
  } catch {
    throw new Fault(422, 'NETWORK_ADDRESS_FORBIDDEN');
  }
  const fixture = b.tlsMode === 'disable-local-test';
  if (fixture && (!allowLocal || b.environment !== 'test' || host !== '127.0.0.1'))
    throw new Fault(422, 'NETWORK_ADDRESS_FORBIDDEN');
  const result = await createEndpoint(
    tx,
    s,
    {
      name: b.name,
      environment: b.environment,
      engine: b.engine,
      host,
      port: b.port,
      allowedAddresses: addresses,
      tlsServerName: b.tlsServerName ?? host,
      allowedDatabases: [b.databaseName],
      allowedRelations: b.metadataScope,
      ...(b.caRef ? { caRef: b.caRef } : {}),
    },
    fixture,
  );
  const store = new ManagedSecrets(config, b.environment);
  let reference: string;
  try {
    reference = await store.put({ username: b.username, password: b.password, revision: '1' });
  } catch {
    throw new Fault(503, 'CREDENTIAL_STORE_UNAVAILABLE');
  }
  try {
    const profile = requireValue(
      await tx.one<{ id: string }>(
        'INSERT INTO credential_profiles(organization_id,label,engine,environment,secret_ref,allowed_endpoint_ids) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [
          s.organizationId,
          b.name + ' · ' + result.endpoint.id.slice(0, 8),
          b.engine,
          b.environment,
          reference,
          [result.endpoint.id],
        ],
      ),
    );
    return await service.createConnection(tx, s, {
      name: b.name,
      environment: b.environment,
      engine: b.engine,
      endpointId: result.endpoint.id,
      databaseName: b.databaseName,
      credentialProfileId: profile.id,
      connectTimeoutMs: b.connectTimeoutMs,
      requestTimeoutMs: b.requestTimeoutMs,
      poolMax: b.poolMax,
      metadataScope: b.metadataScope,
    });
  } catch (error) {
    await store.remove(reference);
    throw error;
  }
}
