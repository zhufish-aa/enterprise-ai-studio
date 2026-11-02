import { randomUUID } from 'node:crypto';
import { digest } from '../packages/connector-transport/dist/index.js';
/** Trusted metadata fixture only. No real release, deployment or production database is exercised. */
export async function seedReleaseFacts(f) {
  const org = f.organizationId,
    user = f.users.admin,
    dataset = f.datasets.secure_orders.dataset,
    version = f.datasets.secure_orders.version;
  const relations = (
    await f.pool.query(
      'SELECT relations FROM metadata_snapshots WHERE physical_connection_id=$1 ORDER BY created_at DESC LIMIT 1',
      [f.connection.id],
    )
  ).rows[0].relations;
  await f.pool.query('UPDATE network_endpoints SET allowed_relations=$2 WHERE id=$1', [
    f.productionEndpointId,
    JSON.stringify(relations.map((r) => ({ schema: r.schema, name: r.name }))),
  ]);
  const c = await f.call('admin', 'POST', '/physical-connections', {
    name: '生产授权元数据替身',
    environment: 'production',
    engine: 'postgresql',
    endpointId: f.productionEndpointId,
    databaseName: 'sales_production',
    credentialProfileId: f.productionProfileId,
    connectTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    poolMax: 1,
    metadataScope: relations.map((r) => ({ schema: r.schema, name: r.name })),
  });
  if (c.status !== 201) throw new Error(JSON.stringify(c.body));
  const connection = c.body,
    meta = randomUUID();
  await f.pool.query(
    "INSERT INTO catalog_jobs(id,organization_id,requested_by,operation,environment,physical_connection_id,input,policy_epoch,status) SELECT $1,$2,$3,'metadata','production',$4,'{}',policy_epoch,'succeeded' FROM organizations WHERE id=$2",
    [meta, org, user, connection.id],
  );
  await f.pool.query(
    'INSERT INTO metadata_snapshots(organization_id,physical_connection_id,job_id,schema_digest,relations) VALUES($1,$2,$3,$4,$5)',
    [org, connection.id, meta, digest(relations), JSON.stringify(relations)],
  );
  await f.pool.query("UPDATE physical_connections SET last_health_status='healthy' WHERE id=$1", [
    connection.id,
  ]);
  const source = (await f.call('admin', 'GET', '/logical-data-sources/' + f.source.id)).body;
  const mapped = await f.call(
    'admin',
    'PUT',
    '/logical-data-sources/' + source.id + '/mappings?environment=production',
    { physicalConnectionId: connection.id },
    { 'If-Match': '"' + source.revision + '"' },
  );
  if (mapped.status !== 200) throw new Error(JSON.stringify(mapped.body));
  await f.grant('developer', 'dataset.query.production');
  await f.grant('limited', 'dataset.query.production');
  const ids = Object.fromEntries(
      [
        'app',
        'report',
        'appVersion',
        'reportVersion',
        'sourceArtifact',
        'buildArtifact',
        'build',
        'release',
        'scope',
        'deployment',
        'grant',
      ].map((k) => [k, randomUUID()]),
    ),
    sourceDigest = 'sha256:' + 'a'.repeat(64),
    buildDigest = 'sha256:' + 'b'.repeat(64);
  await f.pool.query(
    "INSERT INTO resources(id,organization_id,kind) VALUES($1,$3,'app'),($2,$3,'report')",
    [ids.app, ids.report, org],
  );
  await f.pool.query(
    "INSERT INTO apps(id,organization_id,key,name,owner_user_id) VALUES($1,$2,'approved_fixture','授权事实替身',$3)",
    [ids.app, org, user],
  );
  for (const [id, kind, hash] of [
    [ids.sourceArtifact, 'source', sourceDigest],
    [ids.buildArtifact, 'build', buildDigest],
  ])
    await f.pool.query(
      "INSERT INTO artifacts(id,organization_id,kind,object_key,digest,size_bytes,status,owner_user_id) VALUES($1,$2,$3,$6,$4,1,'sealed',$5)",
      [id, org, kind, hash, user, id],
    );
  await f.pool.query(
    "INSERT INTO app_versions(id,organization_id,app_id,version,source_artifact_id,source_digest,manifest,created_by) VALUES($1,$2,$3,1,$4,$5,'{}',$6)",
    [ids.appVersion, org, ids.app, ids.sourceArtifact, sourceDigest, user],
  );
  await f.pool.query(
    "INSERT INTO build_jobs(id,organization_id,app_version_id,status,artifact_id,artifact_digest,template_digest,lock_digest,scan_status,attestation_ref) VALUES($1,$2,$3,'succeeded',$4,$5,'fixture','fixture','passed','fixture-not-real-attestation')",
    [ids.build, org, ids.appVersion, ids.buildArtifact, buildDigest],
  );
  await f.pool.query(
    "INSERT INTO reports(id,organization_id,app_id,key,name) VALUES($1,$2,$3,'approved_fixture','批准报表替身')",
    [ids.report, org, ids.app],
  );
  await f.pool.query(
    "INSERT INTO report_versions(id,organization_id,report_id,app_id,version,config,config_digest) VALUES($1,$2,$3,$4,1,'{}',$5)",
    [ids.reportVersion, org, ids.report, ids.app, digest({})],
  );
  const query = f.query('secure_orders', {
    dimensions: ['order_id', 'amount'],
    orderBy: [{ key: 'order_id', direction: 'asc' }],
  });
  await f.pool.query(
    "INSERT INTO report_version_datasets(organization_id,report_version_id,query_key,dataset_version_id,query_spec) VALUES($1,$2,'main',$3,$4)",
    [org, ids.reportVersion, version.id, JSON.stringify(query)],
  );
  await f.pool.query(
    'INSERT INTO app_version_reports(organization_id,app_id,app_version_id,report_version_id) VALUES($1,$2,$3,$4)',
    [org, ids.app, ids.appVersion, ids.reportVersion],
  );
  await f.pool.query(
    "INSERT INTO release_requests(id,organization_id,app_id,app_version_id,build_job_id,kind,requester_user_id,reason,status,snapshot_digest,review_policy_snapshot,expires_at) VALUES($1,$2,$3,$4,$5,'publish',$6,'metadata-only fixture','approved','pending','{}',now()+interval '1 day')",
    [ids.release, org, ids.app, ids.appVersion, ids.build, user],
  );
  const policy = (
    await f.pool.query(
      'SELECT p.* FROM query_policy_heads h JOIN query_policies p ON p.id=h.policy_id WHERE h.organization_id=$1 AND h.dataset_version_id=$2',
      [org, version.id],
    )
  ).rows[0];
  await f.pool.query(
    'INSERT INTO release_scopes(id,organization_id,release_request_id,dataset_version_id,mapping_id,logical_data_source_id,field_keys,metric_keys,row_policy_key,max_rows,max_duration_ms) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,100,1000)',
    [
      ids.scope,
      org,
      ids.release,
      version.id,
      mapped.body.id,
      source.id,
      f.fields.filter((f) => f.key !== 'email').map((f) => f.key),
      ['paid_total'],
      policy.row_policy_key,
    ],
  );
  await f.pool.query(
    'INSERT INTO release_audiences(organization_id,release_request_id,user_id) VALUES($1,$2,$3)',
    [org, ids.release, f.users.developer],
  );
  for (const principal of [f.users.developer, f.users.limited])
    for (const resource of [ids.app, ids.report])
      await f.pool.query(
        "INSERT INTO resource_grants(organization_id,resource_id,principal_user_id,action,expires_at,constraints) VALUES($1,$2,$3,$4,now()+interval '1 day','{}')",
        [org, resource, principal, resource === ids.app ? 'app.view' : 'report.view'],
      );
  // Explicit metadata substitute; never issued by the TEST compiler.
  await f.pool.query('UPDATE build_jobs SET preview_only=false WHERE id=$1', [ids.build]);
  const scopes = (
    await f.pool.query(
      'SELECT * FROM release_scopes WHERE organization_id=$1 AND release_request_id=$2 ORDER BY dataset_version_id',
      [org, ids.release],
    )
  ).rows;
  const reports = (
    await f.pool.query(
      'SELECT v.id,v.config,v.config_digest,b.query_key,b.query_spec FROM app_version_reports a JOIN report_versions v ON v.organization_id=a.organization_id AND v.id=a.report_version_id JOIN report_version_datasets b ON b.organization_id=v.organization_id AND b.report_version_id=v.id WHERE a.organization_id=$1 AND a.app_version_id=$2 ORDER BY v.id,b.query_key',
      [org, ids.appVersion],
    )
  ).rows;
  const audience = (
    await f.pool.query(
      'SELECT user_id FROM release_audiences WHERE organization_id=$1 AND release_request_id=$2 ORDER BY user_id',
      [org, ids.release],
    )
  ).rows;
  const snapshot = {
    gateway: {
      schemaVersion: 1,
      appVersionId: ids.appVersion,
      artifactDigest: buildDigest,
      scopeDigest: digest(scopes),
      reportsDigest: digest(reports),
      audienceDigest: digest(audience),
      requiredApproverUserIds: [f.users.developer, f.users.limited],
    },
  };
  const hash = digest(snapshot);
  await f.pool.query(
    'UPDATE release_requests SET snapshot_digest=$2,review_policy_snapshot=$3 WHERE id=$1',
    [ids.release, hash, JSON.stringify(snapshot)],
  );
  for (const approver of [f.users.developer, f.users.limited]) {
    const role = (
      await f.pool.query(
        'SELECT role_id FROM role_bindings WHERE organization_id=$1 AND user_id=$2',
        [org, approver],
      )
    ).rows[0].role_id;
    await f.pool.query(
      "INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,'release.approve') ON CONFLICT DO NOTHING",
      [org, role],
    );
    await f.pool.query(
      "INSERT INTO approval_records(organization_id,release_request_id,requester_user_id,approver_user_id,decision,comment,snapshot_digest) VALUES($1,$2,$3,$4,'approve','metadata fixture only',$5)",
      [org, ids.release, user, approver, hash],
    );
  }
  await f.pool.query(
    "INSERT INTO deployments(id,organization_id,app_id,app_version_id,release_request_id,status,artifact_digest) VALUES($1,$2,$3,$4,$5,'active',$6)",
    [ids.deployment, org, ids.app, ids.appVersion, ids.release, buildDigest],
  );
  await f.pool.query(
    'INSERT INTO deployment_slots(organization_id,app_id,deployment_id) VALUES($1,$2,$3)',
    [org, ids.app, ids.deployment],
  );
  await f.pool.query(
    "INSERT INTO runtime_grants(id,organization_id,deployment_id,release_request_id,release_scope_id,dataset_version_id,mapping_id,status,policy_epoch,expires_at) SELECT $1,$2,$3,$4,$5,$6,$7,'active',policy_epoch,now()+interval '1 day' FROM organizations WHERE id=$2",
    [ids.grant, org, ids.deployment, ids.release, ids.scope, version.id, mapped.body.id],
  );
  return { ...ids, query, snapshot };
}
