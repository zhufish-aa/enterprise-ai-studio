import { readFile, stat, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
const expected = [
  'architecture',
  'database-design',
  'api-design',
  'security-design',
  'development-plan',
];
for (const file of [
  'README.md',
  'AGENTS.md',
  'docs/AI_DEVELOPMENT_RULES.md',
  'docs/catalog-guide.md',
  'docs/stage02-validation.md',
  'docs/query-gateway.md',
  'docs/stage03-validation.md',
  'docs/reports-guide.md',
  'docs/harness-plugin.md',
  'docs/stage04-05-validation.md',
  ...expected.map((s) => 'docs/' + s + '.md'),
]) {
  assert.ok((await stat(file)).size > 500, 'Missing substantive document: ' + file);
}
assert.equal((await readdir('docs/adr')).filter((p) => /^\d{4}.*\.md$/.test(p)).length, 21);
const architecture = await readFile('docs/architecture.md', 'utf8');
assert.ok(
  (architecture.match(/```mermaid/g) || []).length >= 8,
  'Expected architecture plus seven workflows',
);
const schema = await readFile('docs/schema.sql', 'utf8');
assert.equal((schema.match(/CREATE TABLE /g) || []).length, 43);
const spec = JSON.parse(await readFile('packages/api-contract/openapi.json', 'utf8'));
const methods = ['get', 'post', 'put', 'patch', 'delete'];
const operations = Object.values(spec.paths).flatMap((p) =>
  Object.entries(p)
    .filter(([m]) => methods.includes(m))
    .map(([, o]) => o),
);
assert.equal(operations.length, 149);
assert.equal(operations.filter((o) => o['x-implementation'] === 'stage04').length, 19);
assert.equal(operations.filter((o) => o['x-implementation'] === 'stage02').length, 33);
assert.equal(operations.filter((o) => o['x-implementation'] === 'stage03').length, 17);
assert.equal(operations.filter((o) => o['x-implementation'] === 'retired-stage03').length, 1);
const gatewayMigration = await readFile('infra/migrations/0003_query_gateway.sql', 'utf8');
for (const table of ['query_policies', 'query_policy_heads', 'query_audits'])
  assert.ok(gatewayMigration.includes('CREATE TABLE ' + table));
const migration = await readFile('infra/migrations/0002_catalog.sql', 'utf8');
assert.equal((migration.match(/CREATE TABLE /g) || []).length, 4);
for (const table of ['credential_profiles', 'auth_sessions', 'catalog_jobs', 'metadata_snapshots'])
  assert.ok(migration.includes('CREATE TABLE ' + table));
const config = parse(await readFile('infra/compose.yaml', 'utf8'));
assert.ok(!Object.keys(config.services).some((n) => n.includes('production')));
for (const service of Object.values(config.services)) {
  for (const port of service.ports || [])
    assert.ok(port.startsWith('127.0.0.1:'), 'Non-loopback development port');
  assert.ok(!JSON.stringify(service.volumes || []).includes('docker.sock'));
}
assert.equal(config.networks.control.internal, true);
assert.equal(config.networks['test-data'].internal, true);
parse(await readFile('.github/workflows/ci.yaml', 'utf8'));
const studioMigration = await readFile('infra/migrations/0004_studio.sql', 'utf8');
for (const table of ['studio_artifact_blobs', 'app_dataset_bindings'])
  assert.ok(studioMigration.includes('CREATE TABLE ' + table));
assert.ok(studioMigration.includes('preview_only'));
console.log(
  'Required documents, 21 ADRs, 7 workflows, 63 migrated tables, 149 operations and development YAML checks passed.',
);

for (const [file, tables] of [
  ['0005_site_sharing.sql', ['site_share_revisions', 'site_share_heads']],
  ['0006_personal_access_tokens.sql', ['personal_access_tokens']],
]) {
  const sql = await readFile('infra/migrations/' + file, 'utf8');
  for (const table of tables) assert.ok(sql.includes('CREATE TABLE ' + table));
}
assert.equal(operations.filter((o) => o['x-implementation'] === 'site-sharing').length, 4);
assert.equal(operations.filter((o) => o['x-implementation'] === 'personal-tokens').length, 3);

assert.equal(operations.filter((o) => o['x-implementation'] === 'password-accounts').length, 9);
const accountMigration = await readFile('infra/migrations/0007_password_accounts.sql', 'utf8');
for (const table of ['password_accounts', 'auth_rate_limits', 'organization_invitations'])
  assert.ok(accountMigration.includes('CREATE TABLE ' + table));

assert.equal(operations.filter((o) => o['x-implementation'] === 'server-workspace').length, 8);
assert.equal(operations.filter((o) => o['x-implementation'] === 'endpoint-management').length, 2);
for (const file of [
  'docs/server-workspaces.md',
  'packages/harness-plugin/skills/enterprise-sites/SKILL.md',
])
  assert.ok((await stat(file)).size > 500);
