import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { isIP, BlockList } from 'node:net';
import pg from 'pg';
import { canonical } from '../packages/connector-transport/dist/index.js';
const permissions = [
  'session.read',
  'source.read',
  'dataset.read',
  'dataset.query.test',
  'catalog.manage',
  'network.manage',
  'connection.manage',
  'mapping.manage',
  'permission.manage',
  'connection.test.test',
  'connection.test.production',
  'connection.metadata.test',
  'connection.metadata.production',
  'dataset.query.production',
  'dataset.export',
  'dataset.unmask',
  'app.view',
  'report.view',
  'query.policy.manage',
  'query.diagnose',
  'query.audit.read',
  'release.approve',
];
const uuid = (v) =>
  typeof v === 'string' && /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v);
const text = (v) => typeof v === 'string' && v.length > 0 && v.length <= 253;
const invariant = (ok, code) => {
  if (!ok) throw new Error(code);
};
/** Privileged, offline provisioning. This remains the privileged provisioning path for secrets and non-browser endpoint policies. */
export async function configureCatalog(pool, c) {
  invariant(
    uuid(c.organization?.id) && text(c.organization.key) && text(c.organization.name),
    'INVALID_ORGANIZATION',
  );
  invariant(
    Array.isArray(c.users) &&
      Array.isArray(c.roles) &&
      Array.isArray(c.endpoints) &&
      Array.isArray(c.credentialProfiles),
    'INVALID_CONFIGURATION',
  );
  for (const u of c.users)
    invariant(
      uuid(u.id) &&
        text(u.displayName) &&
        text(u.subject) &&
        typeof u.issuer === 'string' &&
        u.issuer.startsWith('https://'),
      'INVALID_OIDC_USER',
    );
  for (const r of c.roles)
    invariant(
      uuid(r.id) &&
        text(r.key) &&
        text(r.name) &&
        Array.isArray(r.permissions) &&
        r.permissions.every((p) => permissions.includes(p)) &&
        Array.isArray(r.userIds) &&
        r.userIds.every((id) => c.users.some((u) => u.id === id)),
      'INVALID_ROLE',
    );
  for (const e of c.endpoints) {
    invariant(
      uuid(e.id) &&
        text(e.name) &&
        ['test', 'production'].includes(e.environment) &&
        ['postgresql', 'mysql', 'sqlserver'].includes(e.engine) &&
        text(e.host) &&
        !/[\s/@%:]/.test(e.host.replace(/^\[|\]$/g, '')) &&
        Number.isInteger(e.port) &&
        e.port > 0 &&
        e.port <= 65535 &&
        text(e.tlsServerName),
      'INVALID_ENDPOINT',
    );
    invariant(
      Array.isArray(e.allowedCidrs) && e.allowedCidrs.length > 0 && e.allowedCidrs.length <= 20,
      'INVALID_CIDR',
    );
    for (const cidr of e.allowedCidrs) {
      const [address, bits, ...extra] = String(cidr).split('/');
      const family = isIP(address);
      invariant(
        family &&
          bits !== undefined &&
          !extra.length &&
          /^\d+$/.test(bits) &&
          Number(bits) >= (family === 4 ? 8 : 32) &&
          Number(bits) <= (family === 4 ? 32 : 128),
        'CIDR_TOO_BROAD_OR_INVALID',
      );
      new BlockList().addSubnet(address, Number(bits), family === 4 ? 'ipv4' : 'ipv6');
    }
    invariant(
      Array.isArray(e.allowedDatabases) &&
        e.allowedDatabases.length > 0 &&
        e.allowedDatabases.every(text) &&
        Array.isArray(e.allowedRelations) &&
        e.allowedRelations.length > 0 &&
        e.allowedRelations.length <= 200 &&
        e.allowedRelations.every((r) => text(r.schema) && text(r.name)),
      'INVALID_SCOPE',
    );
    invariant(
      !e.caRef || (/^[-a-zA-Z0-9_/]+$/.test(e.caRef) && !e.caRef.includes('..')),
      'INVALID_CA_REFERENCE',
    );
  }
  for (const p of c.credentialProfiles) {
    invariant(
      uuid(p.id) &&
        text(p.label) &&
        ['test', 'production'].includes(p.environment) &&
        ['postgresql', 'mysql', 'sqlserver'].includes(p.engine) &&
        typeof p.secretRef === 'string' &&
        /^[-a-zA-Z0-9_/]+$/.test(p.secretRef) &&
        !p.secretRef.includes('..') &&
        Array.isArray(p.endpointIds) &&
        p.endpointIds.length > 0,
      'INVALID_CREDENTIAL_PROFILE',
    );
    for (const id of p.endpointIds)
      invariant(
        c.endpoints.some(
          (e) => e.id === id && e.engine === p.engine && e.environment === p.environment,
        ),
        'CREDENTIAL_ENDPOINT_MISMATCH',
      );
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(62802402)');
    await client.query(
      'INSERT INTO organizations(id,key,name) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',
      [c.organization.id, c.organization.key, c.organization.name],
    );
    await client.query("SELECT set_config('eas.organization_id',$1,true)", [c.organization.id]);
    for (const key of permissions)
      await client.query(
        'INSERT INTO permissions(key,description) VALUES($1,$1) ON CONFLICT DO NOTHING',
        [key],
      );
    for (const u of c.users) {
      await client.query(
        "INSERT INTO users(id,oidc_issuer,oidc_subject,display_name,status) VALUES($1,$2,$3,$4,'active') ON CONFLICT(id) DO NOTHING",
        [u.id, u.issuer, u.subject, u.displayName],
      );
      await client.query(
        "INSERT INTO organization_members(organization_id,user_id,status) VALUES($1,$2,'active') ON CONFLICT DO NOTHING",
        [c.organization.id, u.id],
      );
    }
    for (const r of c.roles) {
      await client.query(
        'INSERT INTO roles(id,organization_id,key,name) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
        [r.id, c.organization.id, r.key, r.name],
      );
      for (const permission of r.permissions)
        await client.query(
          'INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [c.organization.id, r.id, permission],
        );
      for (const userId of r.userIds)
        await client.query(
          'INSERT INTO role_bindings(organization_id,user_id,role_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [c.organization.id, userId, r.id],
        );
    }
    for (const e of c.endpoints) {
      const values = [
        e.id,
        c.organization.id,
        e.name,
        e.environment,
        e.host,
        e.port,
        e.allowedCidrs,
        e.tlsServerName,
        e.engine,
        e.allowedDatabases,
        JSON.stringify(e.allowedRelations),
        e.caRef ?? null,
      ];
      const old = (await client.query('SELECT * FROM network_endpoints WHERE id=$1', [e.id]))
        .rows[0];
      if (old) {
        invariant(
          old.organization_id === c.organization.id &&
            old.host === e.host &&
            old.port === e.port &&
            old.environment === e.environment &&
            old.engine === e.engine &&
            old.tls_server_name === e.tlsServerName &&
            JSON.stringify(old.allowed_cidrs) === JSON.stringify(e.allowedCidrs) &&
            JSON.stringify(old.allowed_databases) === JSON.stringify(e.allowedDatabases) &&
            canonical(old.allowed_relations) === canonical(e.allowedRelations) &&
            (old.ca_ref ?? null) === (e.caRef ?? null),
          'EXISTING_ENDPOINT_IMMUTABLE',
        );
      } else
        await client.query(
          "INSERT INTO network_endpoints(id,organization_id,name,environment,host,port,allowed_cidrs,tls_server_name,engine,allowed_databases,allowed_relations,ca_ref,tls_mode,local_fixture) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'verify-full',false)",
          values,
        );
    }
    for (const p of c.credentialProfiles) {
      const old = (await client.query('SELECT * FROM credential_profiles WHERE id=$1', [p.id]))
        .rows[0];
      if (old)
        invariant(
          old.organization_id === c.organization.id &&
            old.environment === p.environment &&
            old.engine === p.engine &&
            old.secret_ref === p.secretRef &&
            JSON.stringify(old.allowed_endpoint_ids) === JSON.stringify(p.endpointIds),
          'EXISTING_PROFILE_IMMUTABLE',
        );
      else
        await client.query(
          'INSERT INTO credential_profiles(id,organization_id,label,engine,environment,secret_ref,allowed_endpoint_ids) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [p.id, c.organization.id, p.label, p.engine, p.environment, p.secretRef, p.endpointIds],
        );
    }
    await client.query('UPDATE organizations SET policy_epoch=policy_epoch+1 WHERE id=$1', [
      c.organization.id,
    ]);
    await client.query(
      "INSERT INTO audit_logs(organization_id,actor_service,action,outcome,request_id,safe_metadata) VALUES($1,'operator-cli','catalog.provision','allow',$2,$3)",
      [
        c.organization.id,
        randomUUID(),
        JSON.stringify({
          users: c.users.length,
          endpoints: c.endpoints.length,
          profiles: c.credentialProfiles.length,
        }),
      ],
    );
    await client.query('COMMIT');
    return {
      organizationId: c.organization.id,
      endpoints: c.endpoints.length,
      profiles: c.credentialProfiles.length,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/configure-catalog.mjs')) {
  const filename = process.argv[2],
    url = process.env.MIGRATION_DATABASE_URL;
  if (!filename || !url) {
    console.error(
      'Usage: MIGRATION_DATABASE_URL=<privileged URL> pnpm catalog:configure <operator-config.json>',
    );
    process.exitCode = 1;
  } else {
    const pool = new pg.Pool({ connectionString: url });
    try {
      const c = JSON.parse(await readFile(filename, 'utf8'));
      console.info(JSON.stringify(await configureCatalog(pool, c)));
    } catch (e) {
      console.error(
        'Catalog provisioning failed: ' +
          (typeof e?.code === 'string'
            ? e.code
            : /^[A-Z_]+$/.test(e?.message ?? '')
              ? e.message
              : 'INVALID_CONFIGURATION'),
      );
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  }
}
