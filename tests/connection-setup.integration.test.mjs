import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {readFile,readdir} from 'node:fs/promises';import {join} from 'node:path';
import {createCatalogFixture,waitJob} from '../scripts/catalog-fixture.mjs';
import {ManagedSecrets} from '../packages/connector-transport/dist/index.js';
test('direct database setup and administrator endpoint registration with real PostgreSQL',async t=>{
 const f=await createCatalogFixture();t.after(()=>f.close());const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.body));return r.body;},count=async table=>Number((await f.pool.query('SELECT count(*) FROM '+table)).rows[0].count);
 const config={name:'直接配置销售测试库',environment:'test',engine:'postgresql',host:'127.0.0.1',port:f.postgres.port,databaseName:'source_test',username:'eas_source_reader',password:f.readerPassword,tlsMode:'disable-local-test',metadataScope:f.relations,connectTimeoutMs:2000,requestTimeoutMs:5000,poolMax:2};let connection;
 await t.test('ordinary users, AI and connection-only maintainers cannot create endpoints or submit credentials',async()=>{
  const before=await count('network_endpoints'),files=await readdir(f.managedSecretConfig.directory);
  for(const user of ['developer','limited','ai','outsider'])assert.equal((await f.call(user,'POST','/physical-connections/configure',config)).status,403);
  assert.equal(await count('network_endpoints'),before);assert.deepEqual(await readdir(f.managedSecretConfig.directory),files);
 });
 await t.test('one form creates endpoint, encrypted credential reference and usable physical connection idempotently',async()=>{
  const key=randomUUID(),before=await count('physical_connections');connection=ok(await f.call('admin','POST','/physical-connections/configure',config,{'Idempotency-Key':key}),201);const replay=ok(await f.call('admin','POST','/physical-connections/configure',config,{'Idempotency-Key':key}),201);assert.equal(replay.id,connection.id);assert.equal(await count('physical_connections'),before+1);assert.equal(connection.host,'127.0.0.1');assert.deepEqual(connection.metadataScope,f.relations);
  const reference=(await f.pool.query('SELECT secret_ref FROM physical_connections WHERE id=$1',[connection.id])).rows[0].secret_ref;assert.match(reference,/^managed:test:/);const value=await new ManagedSecrets(f.managedSecretConfig,'test').get(reference);assert.equal(value.password,f.readerPassword);
  const all=await readdir(f.managedSecretConfig.directory);assert.equal(all.length,1);assert.ok(!(await readFile(join(f.managedSecretConfig.directory,all[0]),'utf8')).includes(f.readerPassword));
 });
 await t.test('real database health and metadata reads succeed with the submitted encrypted credential',async()=>{
  const health=ok(await f.call('admin','POST','/physical-connections/'+connection.id+'/tests'),202);assert.equal((await waitJob(f,'admin',health.id)).status,'succeeded');
  const job=ok(await f.call('admin','POST','/physical-connections/'+connection.id+'/metadata-syncs',{relations:[{schema:'sales',name:'orders'}]}),202);assert.equal((await waitJob(f,'admin',job.id)).status,'succeeded');const metadata=ok(await f.call('admin','GET','/physical-connections/'+connection.id+'/metadata'));assert.equal(metadata.items[0].relations[0].name,'orders');assert.ok(metadata.items[0].relations[0].columns.some(c=>c.name==='amount'));
 });
 await t.test('incorrect database password gives actual failed health result without leaking driver error',async()=>{
  const bad=ok(await f.call('admin','POST','/physical-connections/configure',{...config,name:'错误密码连接',password:'definitely-wrong-private-value'}),201),job=ok(await f.call('admin','POST','/physical-connections/'+bad.id+'/tests'),202),done=await waitJob(f,'admin',job.id);assert.equal(done.status,'failed');assert.ok(!JSON.stringify(done).includes('definitely-wrong-private-value'));assert.ok(!JSON.stringify(done).includes('password authentication failed'));
 });
 await t.test('special addresses and forged production TLS bypass create no records or secrets',async()=>{
  const before=await count('network_endpoints'),files=await readdir(f.managedSecretConfig.directory);
  for(const host of ['169.254.169.254','0.0.0.0','224.0.0.1','http://127.0.0.1','127.1','2130706433']){const r=await f.call('admin','POST','/physical-connections/configure',{...config,host,tlsMode:'verify-full'});assert.ok(r.status>=400,host);}
  assert.ok((await f.call('admin','POST','/physical-connections/configure',{...config,environment:'production'})).status>=400);assert.equal(await count('network_endpoints'),before);assert.deepEqual(await readdir(f.managedSecretConfig.directory),files);
 });
 await t.test('administrator adds a fixed endpoint without any database probe; credentials are endpoint-bound',async()=>{
  const before=await count('catalog_jobs'),endpoint=ok(await f.call('admin','POST','/network-endpoints',{name:'ERP网络地址',environment:'test',engine:'postgresql',host:'10.20.30.40',port:5432,allowedAddresses:['10.20.30.40'],tlsServerName:'erp.internal',allowedDatabases:['erp_test'],allowedRelations:[{schema:'sales',name:'orders'}]}),201);assert.equal(endpoint.endpoint.host,'10.20.30.40');assert.equal(endpoint.endpoint.tlsMode,'verify-full');assert.equal(await count('catalog_jobs'),before);
  const mismatch=await f.call('admin','POST','/physical-connections',{name:'不允许错用凭据',environment:'test',engine:'postgresql',endpointId:endpoint.endpoint.id,databaseName:'erp_test',credentialProfileId:f.profileId,connectTimeoutMs:1000,requestTimeoutMs:1000,poolMax:1,metadataScope:[{schema:'sales',name:'orders'}]});assert.equal(mismatch.status,422);
 });
 await t.test('password never appears in responses, logs, audits or idempotency response data',async()=>{
  const responses=[ok(await f.call('admin','GET','/physical-connections')),ok(await f.call('admin','GET','/credential-profiles')),ok(await f.call('admin','GET','/network-endpoints'))];
  for(const value of [...responses,f.logs,(await f.pool.query('SELECT response_body FROM idempotency_records')).rows,(await f.pool.query('SELECT * FROM audit_logs')).rows]){assert.ok(!JSON.stringify(value).includes(f.readerPassword));assert.ok(!JSON.stringify(value).includes('definitely-wrong-private-value'));}
  const reference=(await f.pool.query('SELECT secret_ref FROM physical_connections WHERE id=$1',[connection.id])).rows[0].secret_ref;await assert.rejects(()=>new ManagedSecrets(f.managedSecretConfig,'production').get(reference));const id=reference.split(':')[2],path=join(f.managedSecretConfig.directory,id+'.json'),original=JSON.parse(await readFile(path,'utf8'));assert.equal(original.version,1);
 });
});
