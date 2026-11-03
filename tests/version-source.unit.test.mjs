import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { StudioService } from '../apps/platform-api/dist/studio/service.js';

const source = {
  manifest: { schemaVersion: '1.0', entrypoint: 'src/main.tsx', datasetRefs: [], queries: [] },
  files: [{ path: 'src/main.tsx', content: '// frozen\n' }],
  message: 'first',
};
const bytes = Buffer.from(JSON.stringify(source));
const digest = 'sha256:' + createHash('sha256').update(bytes).digest('hex');
function fixture() {
  const calls = [];
  const service = new StudioService({}, {}, (name) => name === 'SourceUpload');
  service.version = async (...args) => {
    calls.push(['version', ...args.slice(2)]);
    return { source_artifact_id: 'artifact', source_digest: digest, manifest: source.manifest };
  };
  service.validateManifest = async (_tx, _s, manifest) => {
    calls.push(['manifest', manifest]);
  };
  const tx = {
    one: async (query, params) => {
      calls.push(['blob', query, params]);
      return { content: bytes };
    },
  };
  return { calls, service, tx, subject: { organizationId: 'org' } };
}
test('snapshot checks developer membership and live manifest before reading tenant-bound sealed artifact', async () => {
  const f = fixture();
  assert.deepEqual(await f.service.versionSource(f.tx, f.subject, 'app', 'version'), source);
  assert.deepEqual(f.calls[0], ['version', 'app', 'version', true]);
  assert.equal(f.calls[1][0], 'manifest');
  assert.match(f.calls[2][1], /organization_id=\$1.*artifact_id=\$2.*status='sealed'.*digest=\$3/);
  assert.deepEqual(f.calls[2][2], ['org', 'artifact', digest]);
});
test('authorization denial never loads source bytes', async () => {
  for (const phase of ['version', 'validateManifest']) {
    const f = fixture();
    f.service[phase] = async () => {
      throw new Error('revoked');
    };
    await assert.rejects(
      () => f.service.versionSource(f.tx, f.subject, 'app', 'version'),
      /revoked/,
    );
    assert.ok(!f.calls.some((c) => c[0] === 'blob'));
  }
});
test('snapshot rejects tampered bytes, missing sealed artifacts and invalid schema', async () => {
  const f = fixture();
  f.tx.one = async () => ({ content: Buffer.from('{}') });
  await assert.rejects(
    () => f.service.versionSource(f.tx, f.subject, 'app', 'version'),
    (e) => e.code === 'SOURCE_DIGEST_MISMATCH',
  );
  f.tx.one = async () => undefined;
  await assert.rejects(
    () => f.service.versionSource(f.tx, f.subject, 'app', 'version'),
    (e) => e.status === 404,
  );
  const invalid = fixture();
  invalid.service.validate = () => false;
  await assert.rejects(
    () => invalid.service.versionSource(invalid.tx, invalid.subject, 'app', 'version'),
    (e) => e.code === 'SOURCE_SNAPSHOT_INVALID',
  );
});
