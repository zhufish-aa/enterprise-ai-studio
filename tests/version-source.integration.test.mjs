import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createCatalogFixture } from '../scripts/catalog-fixture.mjs';
import { seedSalesFixture } from '../scripts/sales-fixture.mjs';

test('immutable version source: bytes and live authorization over real HTTP/PostgreSQL', async (t) => {
  const f = await createCatalogFixture({ withBuild: true });
  t.after(() => f.close());
  const sales = await seedSalesFixture(f);
  const ok = (response, status = 200) => {
    assert.equal(response.status, status, JSON.stringify(response.body));
    return response.body;
  };
  const sourcePath = (appId, versionId) => `/apps/${appId}/versions/${versionId}/source`;
  const path = sourcePath(sales.app.id, sales.version.id);
  const original = ok(await f.call('developer', 'GET', path));
  await t.test(
    'returns original sealed text, no-store, and never changes the workspace',
    async () => {
      const response = await f.call('developer', 'GET', path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(
        original.files,
        [...sales.upload.files].sort((a, b) => a.path.localeCompare(b.path)),
      );
      assert.deepEqual(original.manifest, sales.upload.manifest);
      const audit = (
        await f.pool.query(
          "SELECT safe_metadata FROM audit_logs WHERE action='getStudioVersionSource' AND resource_id=$1",
          [sales.app.id],
        )
      ).rows;
      assert.ok(audit.length > 0);
      assert.deepEqual(audit[0].safe_metadata, { appVersionId: sales.version.id });
      const workspace = ok(await f.call('developer', 'GET', `/apps/${sales.app.id}/workspace`));
      const edited = structuredClone(sales.upload);
      edited.files[0].content += '\n// second version, not original\n';
      edited.message = 'diff snapshot second version';
      const second = ok(
        await f.call('developer', 'POST', `/apps/${sales.app.id}/versions`, edited),
        201,
      );
      assert.deepEqual(ok(await f.call('developer', 'GET', path)), original);
      assert.notDeepEqual(
        ok(await f.call('developer', 'GET', sourcePath(sales.app.id, second.id))).files,
        original.files,
      );
      assert.deepEqual(
        ok(await f.call('developer', 'GET', `/apps/${sales.app.id}/workspace`)),
        workspace,
      );
    },
  );
  await t.test('no administrator, nonmember, cross-app or cross-organization bypass', async () => {
    for (const actor of ['admin', 'limited', 'outsider']) {
      assert.ok((await f.call(actor, 'GET', path)).status >= 400, actor);
    }
    const other = ok(
      await f.call('developer', 'POST', '/apps', {
        key: 'source_boundary',
        name: '源码边界',
        type: 'SITE',
        description: 'snapshot isolation',
        workspaceId: 'server',
        datasetRefs: [],
      }),
      201,
    );
    assert.equal(
      (await f.call('developer', 'GET', sourcePath(other.id, sales.version.id))).status,
      404,
    );
    assert.equal(
      (await f.call('developer', 'GET', sourcePath(sales.app.id, randomUUID()))).status,
      404,
    );
    assert.ok(
      (
        await f.call('developer', 'GET', path, undefined, {
          'X-Organization-Id': f.otherOrganizationId,
        })
      ).status >= 400,
    );
  });
  await t.test(
    'viewer downgrade and member revocation deny even a previously read snapshot',
    async () => {
      await f.pool.query(
        "UPDATE app_members SET role='viewer' WHERE organization_id=$1 AND app_id=$2 AND user_id=$3",
        [f.organizationId, sales.app.id, f.users.developer],
      );
      assert.equal((await f.call('developer', 'GET', path)).status, 404);
      await f.pool.query(
        'DELETE FROM app_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',
        [f.organizationId, sales.app.id, f.users.developer],
      );
      assert.equal((await f.call('developer', 'GET', path)).status, 404);
      await f.pool.query("INSERT INTO app_members VALUES($1,$2,$3,'maintainer')", [
        f.organizationId,
        sales.app.id,
        f.users.developer,
      ]);
      assert.deepEqual(ok(await f.call('developer', 'GET', path)), original);
    },
  );
  await t.test('current field and dataset grants are rechecked', async () => {
    const grants = (
      await f.pool.query(
        'SELECT id,constraints FROM resource_grants WHERE organization_id=$1 AND principal_user_id=$2 AND resource_id=$3',
        [f.organizationId, f.users.developer, sales.dataset.id],
      )
    ).rows;
    for (const grant of grants)
      await f.pool.query('UPDATE resource_grants SET constraints=$2 WHERE id=$1', [
        grant.id,
        JSON.stringify({
          ...grant.constraints,
          fieldKeys: grant.constraints.fieldKeys.filter((key) => key !== 'product_name'),
        }),
      ]);
    assert.ok((await f.call('developer', 'GET', path)).status >= 400);
    for (const grant of grants)
      await f.pool.query('UPDATE resource_grants SET constraints=$2 WHERE id=$1', [
        grant.id,
        JSON.stringify(grant.constraints),
      ]);
    assert.deepEqual(ok(await f.call('developer', 'GET', path)), original);
    await f.pool.query(
      "DELETE FROM resource_grants WHERE organization_id=$1 AND principal_user_id=$2 AND resource_id=$3 AND action='dataset.query.test'",
      [f.organizationId, f.users.developer, sales.dataset.id],
    );
    assert.ok((await f.call('developer', 'GET', path)).status >= 400);
  });
});
