import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
const db = new PGlite();
try {
  await db.exec(await readFile(new URL('../docs/schema.sql', import.meta.url), 'utf8'));
  const result = await db.query(
    "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'",
  );
  assert.ok(result.rows[0].count >= 35);
  const [orgA, orgB, userA, userB, appA, sourceA, endpointA, connectionA] = Array.from(
    { length: 8 },
    (_, n) => `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`,
  );
  await db.query('INSERT INTO organizations(id,key,name) VALUES ($1,$2,$2),($3,$4,$4)', [
    orgA,
    'alpha',
    orgB,
    'beta',
  ]);
  await db.query(
    "INSERT INTO users(id,oidc_issuer,oidc_subject,display_name,status) VALUES ($1,'issuer','a','A','active'),($2,'issuer','b','B','active')",
    [userA, userB],
  );
  await db.query(
    "INSERT INTO organization_members(organization_id,user_id,status) VALUES ($1,$2,'active'),($1,$3,'active'),($4,$3,'active')",
    [orgA, userA, userB, orgB],
  );
  await db.query("INSERT INTO resources(id,organization_id,kind) VALUES ($1,$2,'app')", [
    appA,
    orgA,
  ]);
  await db.query(
    "INSERT INTO apps(id,organization_id,key,name,owner_user_id) VALUES ($1,$2,'app_a','App A',$3)",
    [appA, orgA, userA],
  );
  await assert.rejects(
    db.query(
      "INSERT INTO app_members(organization_id,app_id,user_id,role) VALUES ($1,$2,$3,'developer')",
      [orgB, appA, userB],
    ),
    (e) => e.code === '23503',
    'Cross-org app member must fail',
  );
  await db.query(
    "INSERT INTO logical_data_sources(id,organization_id,key,name) VALUES ($1,$2,'crm','CRM')",
    [sourceA, orgA],
  );
  await db.query(
    "INSERT INTO network_endpoints(id,organization_id,name,environment,host,port,allowed_cidrs,tls_server_name) VALUES ($1,$2,'prod','production','db.internal',5432,ARRAY['10.1.0.0/24'::cidr],'db.internal')",
    [endpointA, orgA],
  );
  await db.query(
    "INSERT INTO physical_connections(id,organization_id,name,environment,engine,endpoint_id,database_name,secret_ref,status) VALUES ($1,$2,'prod','production','postgresql',$3,'crm','vault:prod/crm','active')",
    [connectionA, orgA, endpointA],
  );
  await assert.rejects(
    db.query(
      "INSERT INTO source_mappings(organization_id,logical_data_source_id,environment,physical_connection_id,revision,schema_digest) VALUES ($1,$2,'test',$3,1,'digest')",
      [orgA, sourceA, connectionA],
    ),
    (e) => e.code === '23503',
    'Test mapping must reject production connection',
  );
  await assert.rejects(
    db.query(
      "INSERT INTO query_jobs(organization_id,initiator_user_id,app_version_id,dataset_version_id,environment,mapping_id,logical_data_source_id,query_spec,policy_epoch,status,expires_at) VALUES ($1,$2,gen_random_uuid(),gen_random_uuid(),'production',gen_random_uuid(),$3,'{}',1,'queued',now()+interval '1 hour')",
      [orgA, userA, sourceA],
    ),
    (e) => e.code === '23514',
    'Production job without grant must fail',
  );
  const [sourceArtifact, buildArtifact, appVersion, buildJob, release] = Array.from(
    { length: 5 },
    (_, n) => `00000000-0000-4000-8000-${String(n + 9).padStart(12, '0')}`,
  );
  const digest = 'sha256:' + 'a'.repeat(64);
  await db.query(
    "INSERT INTO artifacts(id,organization_id,kind,object_key,digest,size_bytes,status,owner_user_id) VALUES ($1,$2,'source','source.zip',$3,1,'sealed',$4),($5,$2,'build','build.zip',$3,1,'sealed',$4)",
    [sourceArtifact, orgA, digest, userA, buildArtifact],
  );
  await db.query(
    "INSERT INTO app_versions(id,organization_id,app_id,version,source_artifact_id,source_digest,manifest,created_by) VALUES ($1,$2,$3,1,$4,$5,'{}',$6)",
    [appVersion, orgA, appA, sourceArtifact, digest, userA],
  );
  await db.query(
    "INSERT INTO build_jobs(id,organization_id,app_version_id,status,artifact_id,artifact_digest,template_digest,lock_digest,scan_status,attestation_ref) VALUES ($1,$2,$3,'succeeded',$4,$5,$5,$5,'passed','attestations/build.json')",
    [buildJob, orgA, appVersion, buildArtifact, digest],
  );
  await db.query(
    "INSERT INTO release_requests(id,organization_id,app_id,app_version_id,build_job_id,kind,requester_user_id,reason,status,snapshot_digest,review_policy_snapshot,expires_at) VALUES ($1,$2,$3,$4,$5,'publish',$6,'test','submitted',$7,'{}',now()+interval '1 hour')",
    [release, orgA, appA, appVersion, buildJob, userA, digest],
  );
  const approvalSql =
    "INSERT INTO approval_records(organization_id,release_request_id,requester_user_id,approver_user_id,decision,comment,snapshot_digest) VALUES ($1,$2,$3,$4,'approve','review',$5)";
  await assert.rejects(
    db.query(approvalSql, [orgA, release, userA, userA, digest]),
    (e) => e.code === '23514',
    'Self approval must fail',
  );
  await assert.rejects(
    db.query(approvalSql, [orgA, release, userB, userA, digest]),
    (e) => e.code === '23503',
    'Forging requester must fail',
  );
  await db.query(approvalSql, [orgA, release, userA, userB, digest]);
  await assert.rejects(
    db.query(approvalSql, [orgA, release, userA, userB, digest]),
    (e) => e.code === '23505',
    'Duplicate approval must fail',
  );
  console.log(
    `DDL applied: ${result.rows[0].count} tables; 6 boundary constraints verified (cross-org, environment, production grant, self approval, forged requester, duplicate approval).`,
  );
} finally {
  await db.close();
}
