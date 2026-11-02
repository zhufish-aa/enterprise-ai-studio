import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createCatalogFixture,waitJob} from '../scripts/catalog-fixture.mjs';
import {migrate} from '../scripts/migrate.mjs';
import {waitQuery} from '../scripts/gateway-fixture.mjs';
import {configureCatalog} from '../scripts/configure-catalog.mjs';
test('catalog end-to-end with real PostgreSQL 18, HTTP API and isolated connector',async t=>{
 const f=await createCatalogFixture();t.after(()=>f.close());const responses=[];
 const call=async(...args)=>{if(args[2]==='/queries/test'&&args[3]&&!args[3].query){const input=args[3];args[3]={query:{...input,datasetId:dataset.id,dimensions:input.dimensions.length?input.dimensions:input.metrics.length?[]:version.fields.map(f=>f.key),groupBy:input.metrics.length?input.dimensions:[],orderBy:[]}};}const result=await f.call(...args);responses.push(result.body);return result;};
 const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.body));return r.body;};
 let source,connection,snapshot,dataset,version,readGrant,queryGrant;
 const sourceInput={key:'sales_system',name:'销售业务系统',systemCode:'CRM',engine:'postgresql',description:'销售、订单与客户的统一业务数据目录',department:'销售运营部',ownerUserId:f.users.admin,sensitivity:'internal',status:'enabled'};
 const connectionInput={name:'销售测试连接',environment:'test',engine:'postgresql',endpointId:f.endpointId,databaseName:'source_test',credentialProfileId:f.profileId,connectTimeoutMs:1000,requestTimeoutMs:3000,poolMax:2,metadataScope:f.relations};
 await t.test('migrations are repeatable and runtime role cannot bypass tenant RLS',async()=>{
  await migrate(f.pool);const runtime=new pg.Pool({connectionString:f.runtimeUrl});try{assert.equal((await runtime.query('SELECT * FROM logical_data_sources')).rowCount,0);const role=(await runtime.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,false);await assert.rejects(runtime.query("DELETE FROM audit_logs"),e=>e.code==='42501');}finally{await runtime.end();}
 });
 await t.test('operator inventory provisioning is repeatable and rejects in-place target mutation',async()=>{
  const organization={id:randomUUID(),key:'provision_'+Date.now(),name:'Operator fixture'},id=randomUUID();const config={organization,users:[],roles:[],credentialProfiles:[],endpoints:[{id,name:'approved inventory',environment:'test',engine:'postgresql',host:'db.example.internal',port:5432,allowedCidrs:['10.8.1.0/24'],tlsServerName:'db.example.internal',allowedDatabases:['sales'],allowedRelations:[{schema:'sales',name:'orders'}]}]};
  await configureCatalog(f.pool,config);await configureCatalog(f.pool,config);await assert.rejects(configureCatalog(f.pool,{...config,endpoints:[{...config.endpoints[0],host:'other.example.internal'}]}),/EXISTING_ENDPOINT_IMMUTABLE/);
 });
 await t.test('create and update source with real persistence, ETag and idempotency',async()=>{
  const idem=randomUUID();const created=await call('admin','POST','/logical-data-sources',sourceInput,{'Idempotency-Key':idem});source=ok(created,201);assert.equal(created.headers.get('etag'),'"1"');
  const replay=ok(await call('admin','POST','/logical-data-sources',sourceInput,{'Idempotency-Key':idem}),201);assert.equal(replay.id,source.id);
  assert.equal((await call('admin','POST','/logical-data-sources',{...sourceInput,name:'changed'},{'Idempotency-Key':idem})).status,409);
  const {name,systemCode,description,department,ownerUserId,sensitivity,status}=sourceInput;const input={name,systemCode,description,department,ownerUserId,sensitivity,status};
  source=ok(await call('admin','PATCH','/logical-data-sources/'+source.id,{...input,description:'已核验的销售与客户目录'},{'If-Match':'"1"'}));assert.equal(source.revision,2);
  assert.equal((await call('admin','PATCH','/logical-data-sources/'+source.id,input,{'If-Match':'"1"'})).status,412);
 });
 await t.test('non-administrators and AI clients cannot configure physical connections',async()=>{
  assert.equal((await call('developer','POST','/physical-connections',connectionInput)).status,403);
  assert.equal((await call('ai','POST','/physical-connections',connectionInput)).status,403);
  assert.equal((await call('admin','POST','/physical-connections',{...connectionInput,host:'10.0.0.10',password:'must-not-be-accepted'})).status,400);
  connection=ok(await call('admin','POST','/physical-connections',connectionInput),201);
  assert.equal('secretRef'in connection,false);assert.equal('password'in connection,false);
 });
 await t.test('real PostgreSQL connection succeeds and least-privilege account cannot read unapproved table',async()=>{
  const job=ok(await call('admin','POST','/physical-connections/'+connection.id+'/tests'),202);const result=await waitJob(f,'admin',job.id);assert.equal(result.status,'succeeded');assert.deepEqual(Object.keys(result.result).sort(),['checkedAt','healthy']);
  const reader=new pg.Pool({host:'127.0.0.1',port:f.postgres.port,database:'source_test',user:'eas_source_reader',password:f.readerPassword});try{await assert.rejects(reader.query('SELECT * FROM sales.private_payroll'),e=>e.code==='42501');await assert.rejects(reader.query('INSERT INTO sales.orders(id) VALUES(9)'),e=>e.code==='42501');}finally{await reader.end();}
 });
 await t.test('metadata actually reads tables, view, fields, primary/foreign keys, indexes and comments',async()=>{
  const job=ok(await call('admin','POST','/physical-connections/'+connection.id+'/metadata-syncs',{relations:f.relations}),202);const result=await waitJob(f,'admin',job.id);assert.equal(result.status,'succeeded',JSON.stringify(result));
  snapshot=ok(await call('admin','GET','/physical-connections/'+connection.id+'/metadata')).items[0];assert.equal(snapshot.relations.length,3);
  const orders=snapshot.relations.find(r=>r.name==='orders');assert.equal(orders.comment,'销售订单');assert.deepEqual(orders.primaryKey,['id']);assert.equal(orders.columns.find(c=>c.name==='amount').comment,'订单含税金额（元）');assert.ok(orders.foreignKeys.some(fk=>fk.referencedRelation==='customers'));assert.ok(orders.indexes.some(i=>i.name==='orders_region_idx'));assert.equal(snapshot.relations.find(r=>r.name==='sales_summary').kind,'view');assert.equal(snapshot.relations.some(r=>r.name==='private_payroll'),false);
  assert.equal((await call('admin','POST','/physical-connections/'+connection.id+'/metadata-syncs',{relations:[{schema:'sales',name:'private_payroll'}]})).status,422);
 });
 await t.test('TEST mapping is correct; PROD cannot point at a TEST connection',async()=>{
  const mapped=ok(await call('admin','PUT','/logical-data-sources/'+source.id+'/mappings?environment=test',{physicalConnectionId:connection.id},{'If-Match':'"'+source.revision+'"'}));assert.equal(mapped.environment,'test');assert.equal(mapped.physicalConnectionId,connection.id);
  source=ok(await call('admin','GET','/logical-data-sources/'+source.id));
  assert.equal((await call('admin','PUT','/logical-data-sources/'+source.id+'/mappings?environment=production',{physicalConnectionId:connection.id},{'If-Match':'"'+source.revision+'"'})).status,422);
  const prod=ok(await call('admin','POST','/physical-connections',{...connectionInput,name:'生产连接',environment:'production',endpointId:f.productionEndpointId,databaseName:'sales_production',credentialProfileId:f.productionProfileId}),201);
  assert.equal((await call('developer','POST','/physical-connections/'+prod.id+'/tests')).status,403);assert.equal((await call('limited','POST','/physical-connections/'+prod.id+'/tests')).status,403);
  const health=ok(await call('admin','POST','/physical-connections/'+prod.id+'/tests'),202);const unavailable=await waitJob(f,'admin',health.id);assert.equal(unavailable.status,'failed');assert.equal(unavailable.result,null);
  // A fixture evidence record tests mapping persistence only; it does not validate a production adapter.
  const metaJob=randomUUID();await f.pool.query("INSERT INTO catalog_jobs(id,organization_id,requested_by,operation,environment,physical_connection_id,input,policy_epoch,status) SELECT $1,$2,$3,'metadata','production',$4,'{}',policy_epoch,'succeeded' FROM organizations WHERE id=$2",[metaJob,f.organizationId,f.users.admin,prod.id]);
  await f.pool.query('INSERT INTO metadata_snapshots(organization_id,physical_connection_id,job_id,schema_digest,relations) VALUES($1,$2,$3,$4,$5)',[f.organizationId,prod.id,metaJob,snapshot.schemaDigest,JSON.stringify(snapshot.relations)]);await f.pool.query("UPDATE physical_connections SET last_health_status='healthy' WHERE id=$1",[prod.id]);
  const production=ok(await call('admin','PUT','/logical-data-sources/'+source.id+'/mappings?environment=production',{physicalConnectionId:prod.id},{'If-Match':'"'+source.revision+'"'}));assert.equal(production.environment,'production');
  const mappings=ok(await call('admin','GET','/logical-data-sources/'+source.id+'/mappings')).items;assert.equal(mappings.find(m=>m.environment==='test').physicalConnectionId,connection.id);assert.equal(mappings.find(m=>m.environment==='production').physicalConnectionId,prod.id);
 });
 await t.test('dataset semantic versions are immutable and invisible without a grant',async()=>{
  dataset=ok(await call('admin','POST','/datasets',{key:'sales_orders',name:'销售订单数据集',logicalDataSourceId:source.id,description:'订单金额、区域与支付状态的业务语义'}),201);
  const fields=[['order_id','订单编号','id','integer',false],['region','销售区域','region','string',true],['amount','含税金额','amount','number',false],['status','订单状态','status','string',true]].map(([key,name,physicalColumn,dataType,isDimension])=>({key,name,physicalColumn,dataType,isDimension,classification:'internal',filterable:true,description:name}));
  version=ok(await call('admin','POST','/datasets/'+dataset.id+'/versions',{metadataSnapshotId:snapshot.id,relation:{schema:'sales',name:'orders'},fields,metrics:[{key:'sales_total',name:'已支付销售额',aggregate:'sum',fieldKey:'amount',businessDefinition:'仅汇总已支付订单的含税金额，单位为元。',description:'用于区域销售分析',filters:[{fieldKey:'status',operator:'eq',value:'paid'}],availableDimensions:['region']}],relationships:[]}),201);
  assert.equal(version.version,1);const runtime=new pg.Pool({connectionString:f.runtimeUrl});try{await runtime.query('BEGIN');await runtime.query("SELECT set_config('eas.organization_id',$1,true)",[f.organizationId]);await assert.rejects(runtime.query('UPDATE dataset_versions SET relation_view=$1 WHERE id=$2',['private_payroll',version.id]),e=>e.code==='23514');await runtime.query('ROLLBACK');}finally{await runtime.end();}
  dataset=ok(await call('admin','GET','/datasets/'+dataset.id));dataset=ok(await call('admin','PATCH','/datasets/'+dataset.id,{name:dataset.name,description:dataset.description,status:'enabled'},{'If-Match':'"'+dataset.revision+'"'}));
  ok(await call('admin','POST','/datasets/'+dataset.id+'/query-policies',{datasetVersionId:version.id,organizationFieldKey:null,dedicatedSource:true,departmentFieldKey:null,userFieldKey:null,fixedFilters:[],masks:[],requireDatabaseRls:false,maxRows:1000,maxExportRows:10000,timeoutMs:3000,maxCost:100000,maxScanRows:1000000,slowQueryMs:1000}));
  assert.equal(ok(await call('developer','GET','/datasets')).items.length,0);assert.equal((await call('developer','GET','/dataset-versions/'+version.id)).status,404);
  const expiresAt=new Date(Date.now()+86400_000).toISOString();for(const action of ['dataset.read','dataset.query.test']){const grant=ok(await call('admin','POST','/datasets/'+dataset.id+'/grants',{principalUserId:f.users.developer,action,expiresAt,fieldKeys:fields.map(f=>f.key),metricKeys:['sales_total']}),201);if(action==='dataset.read')readGrant=grant;else queryGrant=grant;}
  assert.equal(ok(await call('developer','GET','/datasets')).items[0].id,dataset.id);assert.equal(ok(await call('developer','GET','/logical-data-sources')).items[0].id,source.id);assert.equal(ok(await call('developer','GET','/dataset-versions/'+version.id)).metrics[0].businessDefinition,'仅汇总已支付订单的含税金额，单位为元。');
 });
 await t.test('real TEST preview uses explicit business metric and parameterized filtering',async()=>{
  const input={datasetVersionId:version.id,dimensions:['region'],metrics:['sales_total'],filters:[],limit:100};const job=ok(await call('developer','POST','/queries/test',input),202);assert.equal(job.environment,'test');const result=await waitQuery(f,'developer',job.id);assert.equal(result.status,'succeeded',JSON.stringify(result));assert.equal(result.result.rows.reduce((n,row)=>n+Number(row[1]),0),21400);
  const injected=ok(await call('developer','POST','/queries/test',{...input,metrics:[],filters:[{fieldKey:'region',operator:'eq',value:"' OR 1=1; DROP TABLE sales.orders; --"}]}),202);assert.deepEqual((await waitQuery(f,'developer',injected.id)).result.rows,[]);assert.equal((await f.sourcePool.query('SELECT count(*) FROM sales.orders')).rows[0].count,'3');
  assert.equal((await call('developer','POST','/queries/test',{...input,environment:'production'})).status,400);
  assert.equal((await call('developer','GET','/physical-connections')).status,403);
 });
 await t.test('failed metadata sync preserves successful snapshot and can recover through retry',async()=>{
  await f.sourcePool.query('REVOKE SELECT ON sales.orders FROM eas_source_reader');const job=ok(await call('admin','POST','/physical-connections/'+connection.id+'/metadata-syncs',{relations:f.relations}),202);const failed=await waitJob(f,'admin',job.id);assert.equal(failed.status,'failed');assert.equal(failed.result,null);assert.equal(ok(await call('admin','GET','/physical-connections/'+connection.id+'/metadata')).items[0].id,snapshot.id);
  await f.sourcePool.query('GRANT SELECT ON sales.orders TO eas_source_reader');const retry=ok(await call('admin','POST','/catalog-jobs/'+job.id+'/retry'),202);assert.equal(retry.retryOf,job.id);assert.equal((await waitJob(f,'admin',retry.id)).status,'succeeded');
 });
 await t.test('bad credentials fail without appearing in API responses or logs',async()=>{
  const bad='never-expose-this-password-'+randomUUID();await writeFile(f.secretFile,JSON.stringify({'local:sales-reader':{...f.secretData['local:sales-reader'],password:bad,revision:'2'}}));
  const job=ok(await call('admin','POST','/physical-connections/'+connection.id+'/tests'),202);const result=await waitJob(f,'admin',job.id);responses.push(result);assert.equal(result.status,'failed');assert.equal(result.failureCode,'CONNECTION_FAILED');
  await writeFile(f.secretFile,JSON.stringify(f.secretData));const serialized=JSON.stringify({responses,logs:f.logs});assert.equal(serialized.includes(bad),false);assert.equal(serialized.includes(f.readerPassword),false);assert.equal(serialized.includes('local:sales-reader'),false);assert.equal(serialized.includes('postgresql://'),false);
 });
 await t.test('unapproved internal address is refused before a database connection',async()=>{
  const blocked=ok(await call('admin','POST','/physical-connections',{...connectionInput,name:'拒绝地址测试',endpointId:f.blockedEndpointId}),201);const job=ok(await call('admin','POST','/physical-connections/'+blocked.id+'/tests'),202);const result=await waitJob(f,'admin',job.id);assert.equal(result.status,'failed');assert.equal(result.failureCode,'NETWORK_ADDRESS_FORBIDDEN');
 });
 await t.test('field-scoped grants hide metrics and cannot escalate preview',async()=>{
  ok(await call('admin','DELETE','/resource-grants/'+readGrant.id));ok(await call('admin','DELETE','/resource-grants/'+queryGrant.id));
  for(const action of ['dataset.read','dataset.query.test']){const grant=ok(await call('admin','POST','/datasets/'+dataset.id+'/grants',{principalUserId:f.users.developer,action,expiresAt:new Date(Date.now()+3600000).toISOString(),fieldKeys:['region'],metricKeys:[]}),201);if(action==='dataset.read')readGrant=grant;else queryGrant=grant;}
  const scoped=ok(await call('developer','GET','/dataset-versions/'+version.id));assert.deepEqual(scoped.fields.map(f=>f.key),['region']);assert.deepEqual(scoped.metrics,[]);
  assert.equal((await call('developer','POST','/queries/test',{datasetVersionId:version.id,dimensions:['region'],metrics:['sales_total'],filters:[],limit:10})).status,422);
 });
 await t.test('expired connector leases recover with a new attempt',async()=>{
  const id=randomUUID();await f.pool.query("INSERT INTO catalog_jobs(id,organization_id,requested_by,operation,environment,physical_connection_id,input,policy_epoch,status,attempt,lease_expires_at) SELECT $1,$2,$3,'health','test',$4,$5,policy_epoch,'running',1,now()-interval '1 second' FROM organizations WHERE id=$2",[id,f.organizationId,f.users.admin,connection.id,JSON.stringify({clientKind:'human',authenticatedAt:Date.now(),connectionRevision:connection.revision})]);
  const result=await waitJob(f,'admin',id);assert.equal(result.status,'succeeded');assert.equal(result.attempt,2);
 });
 await t.test('mapping switch rejects a real snapshot missing dataset fields',async()=>{
  const candidate=ok(await call('admin','POST','/physical-connections',{...connectionInput,name:'仅客户结构候选',metadataScope:[{schema:'sales',name:'customers'}]}),201);
  const health=ok(await call('admin','POST','/physical-connections/'+candidate.id+'/tests'),202);assert.equal((await waitJob(f,'admin',health.id)).status,'succeeded');const sync=ok(await call('admin','POST','/physical-connections/'+candidate.id+'/metadata-syncs',{relations:[{schema:'sales',name:'customers'}]}),202);assert.equal((await waitJob(f,'admin',sync.id)).status,'succeeded');
  source=ok(await call('admin','GET','/logical-data-sources/'+source.id));assert.equal((await call('admin','PUT','/logical-data-sources/'+source.id+'/mappings?environment=test',{physicalConnectionId:candidate.id},{'If-Match':'"'+source.revision+'"'})).status,422);
  assert.equal(ok(await call('admin','GET','/logical-data-sources/'+source.id+'/mappings')).items.find(m=>m.environment==='test').physicalConnectionId,connection.id);
 });
 await t.test('disabled source hides authorized datasets and rejects previews',async()=>{
  source=ok(await call('admin','GET','/logical-data-sources/'+source.id));const {name,systemCode,description,department,ownerUserId,sensitivity}=source;const body={name,systemCode,description,department,ownerUserId,sensitivity,status:'disabled'};source=ok(await call('admin','PATCH','/logical-data-sources/'+source.id,body,{'If-Match':'"'+source.revision+'"'}));
  assert.equal(ok(await call('developer','GET','/datasets')).items.length,0);assert.equal((await call('admin','POST','/queries/test',{datasetVersionId:version.id,dimensions:['region'],metrics:[],filters:[],limit:10})).status,404);
  source=ok(await call('admin','PATCH','/logical-data-sources/'+source.id,{...body,status:'enabled'},{'If-Match':'"'+source.revision+'"'}));
 });
 await t.test('cross-organization access and revoked dataset results are denied',async()=>{
  assert.equal((await call('outsider','GET','/datasets/'+dataset.id)).status,404);assert.equal((await call('outsider','GET','/datasets',undefined,{'X-Organization-Id':f.organizationId})).status,403);
  ok(await call('admin','DELETE','/resource-grants/'+queryGrant.id));assert.equal((await call('developer','POST','/queries/test',{datasetVersionId:version.id,dimensions:[],metrics:[],filters:[],limit:10})).status,404);
  ok(await call('admin','DELETE','/resource-grants/'+readGrant.id));assert.equal((await call('developer','GET','/dataset-versions/'+version.id)).status,404);
 });
 await writeFile('work/stage02-real-results.json',JSON.stringify({postgresVersion:f.postgres.version,verifiedAt:new Date().toISOString(),realAdapters:['postgresql'],unverifiedAdapters:['mysql','sqlserver'],productionMapping:'test fixture evidence only; production connector not exercised'},null,2));
});
