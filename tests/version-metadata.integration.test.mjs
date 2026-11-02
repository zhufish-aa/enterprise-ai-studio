import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogFixture} from '../scripts/catalog-fixture.mjs';
import {seedSalesFixture} from '../scripts/sales-fixture.mjs';

// Added for regression coverage; not executed during the 2026-10-26 user-directed repair.
test('version metadata uses read scope while execution keeps live TEST authorization',async t=>{
 const f=await createCatalogFixture({withBuild:true});t.after(()=>f.close());const sale=await seedSalesFixture(f);
 await f.pool.query("INSERT INTO app_members VALUES($1,$2,$3,'maintainer')",[f.organizationId,sale.app.id,f.users.admin]);
 const path='/apps/'+sale.app.id+'/versions',preview='/apps/'+sale.app.id+'/preview/'+sale.version.id;
 const jobs=async()=>Number((await f.pool.query('SELECT count(*) n FROM query_jobs')).rows[0].n);
 const expire=async(user,actions)=>f.pool.query("UPDATE resource_grants SET expires_at=now()-interval '1 second' WHERE organization_id=$1 AND resource_id=$2 AND principal_user_id=$3 AND action=ANY($4::text[])",[f.organizationId,sale.dataset.id,f.users[user],actions]);
 await t.test('administrator can inspect history after fixture grants expire, but cannot execute',async()=>{
  await expire('admin',['dataset.read','dataset.query.test']);const before=await jobs();
  for(const endpoint of [path,path+'/'+sale.version.id,'/reports/'+sale.report.id+'/versions']){const response=await f.call('admin','GET',endpoint);assert.equal(response.status,200,JSON.stringify(response.body));}
  for(const [method,endpoint,body] of [['GET',preview],['POST',preview+'/queries',{queryKey:'summary',filters:[]}],['POST','/app-versions/'+sale.version.id+'/builds']]){
   const response=await f.call('admin',method,endpoint,body);assert.equal(response.status,403);assert.equal(response.body.error.code,'RESOURCE_GRANT_EXPIRED');assert.ok(response.body.error.details.some(d=>d.field==='expiresAt'));assert.ok(response.body.error.details.some(d=>d.field==='permission'&&d.reason==='dataset.read'));assert.ok(response.body.traceId);
  }
  assert.equal(await jobs(),before);
 });
 await t.test('read-only metadata survives TEST execution expiry and idempotent restore cannot bypass it',async()=>{
  const key=randomUUID(),body={versionId:sale.version.id,message:'metadata authorization regression'};
  assert.equal((await f.call('developer','POST','/apps/'+sale.app.id+'/restore',body,{'Idempotency-Key':key})).status,201);
  await expire('developer',['dataset.query.test']);assert.equal((await f.call('developer','GET',path)).status,200);
  const versionCount=Number((await f.pool.query('SELECT count(*) n FROM app_versions')).rows[0].n),before=await jobs();
  const replay=await f.call('developer','POST','/apps/'+sale.app.id+'/restore',body,{'Idempotency-Key':key});assert.equal(replay.status,403);assert.equal(replay.body.error.code,'RESOURCE_GRANT_EXPIRED');
  assert.equal((await f.call('developer','POST',preview+'/queries',{queryKey:'summary',filters:[]})).status,403);
  assert.equal(Number((await f.pool.query('SELECT count(*) n FROM app_versions')).rows[0].n),versionCount);assert.equal(await jobs(),before);
 });
 await t.test('metadata still enforces fields and expired read grants',async()=>{
  const row=(await f.pool.query("SELECT id,constraints FROM resource_grants WHERE organization_id=$1 AND resource_id=$2 AND principal_user_id=$3 AND action='dataset.read'",[f.organizationId,sale.dataset.id,f.users.developer])).rows[0];
  await f.pool.query('UPDATE resource_grants SET constraints=$2 WHERE id=$1',[row.id,JSON.stringify({...row.constraints,fieldKeys:row.constraints.fieldKeys.filter(key=>key!=='product_name')})]);
  const response=await f.call('developer','GET',path);assert.equal(response.status,403);assert.equal(response.body.error.code,'VERSION_METADATA_ACCESS_DENIED');
  await expire('developer',['dataset.read']);const expired=await f.call('developer','GET',path);assert.equal(expired.status,403);assert.equal(expired.body.error.code,'RESOURCE_GRANT_EXPIRED');
  assert.ok([403,404].includes((await f.call('outsider','GET',path)).status));
 });
});
