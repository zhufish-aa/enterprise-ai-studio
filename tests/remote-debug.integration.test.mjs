// Added for future verification. Not executed in the 2026-10-24 delivery at the user's request.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogFixture} from '../scripts/catalog-fixture.mjs';
import {seedSalesFixture} from '../scripts/sales-fixture.mjs';
import {startPreviewWorker} from '../scripts/preview-worker.mjs';

test('remote debug: real Chromium, real TEST data, interactions, image bytes and current authorization', {timeout:180000},async t=>{
 const preview=await startPreviewWorker();let f;
 t.after(async()=>{if(f)await f.close();await preview.close();});
 f=await createCatalogFixture({withBuild:true,previewWorker:preview.target});
 const sales=await seedSalesFixture(f);
 const ok=(response,status=200)=>{assert.equal(response.status,status,JSON.stringify(response.body));return response.body;};
 const open=()=>f.call('developer','POST','/apps/'+sales.app.id+'/debug-sessions',{versionId:sales.version.id});
 const initial=ok(await open(),202),base='/debug-sessions/'+initial.id;
 const wait=async(predicate)=>{for(let i=0;i<300;i++){const state=ok(await f.call('developer','GET',base));assert.notEqual(state.status,'failed',JSON.stringify(state.events));if(predicate(state))return state;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Debug session did not reach expected state');};
 await wait(state=>state.status==='ready'&&state.events.some(event=>event.type==='query'&&event.message.includes('成功'))&&state.pendingQueries===0);
 await t.test('screenshot is real PNG for the bound immutable version',async()=>{
  const image=ok(await f.call('developer','GET',base+'/screenshot?fullPage=false'));
  const bytes=Buffer.from(image.base64,'base64');assert.deepEqual(bytes.subarray(0,8),Buffer.from([137,80,78,71,13,10,26,10]));
  assert.equal(image.versionId,sales.version.id);assert.equal(bytes.readUInt32BE(16),image.width);assert.equal(bytes.readUInt32BE(20),image.height);
  assert.ok(image.width>0&&image.height>0);assert.equal(image.pendingQueries,0);
 });
 await t.test('browser console evaluation, DOM changes and errors are observable',async()=>{
  ok(await f.call('developer','POST',base+'/actions',{type:'evaluate',expression:'(()=>{console.error("debug-console-marker");document.body.dataset.remoteDebug="actual-dom";return {marker:document.body.dataset.remoteDebug,hasNode:typeof process};})()'}),202);
  const state=await wait(state=>state.pendingActions===0&&state.observation?.result?.marker==='actual-dom');assert.equal(state.observation.result.hasNode,'undefined');
  await wait(state=>state.events.some(event=>event.type==='console'&&event.message==='debug-console-marker'));
  ok(await f.call('developer','POST',base+'/actions',{type:'inspect',selector:'body'}),202);
  const inspected=await wait(state=>state.pendingActions===0&&typeof state.observation?.html==='string');assert.ok(inspected.observation.html.includes('actual-dom'));assert.ok(inspected.observation.bounds.width>0);
 });
 await t.test('owner isolation holds even for another developer with same app grants',async()=>{
  await f.pool.query("INSERT INTO app_members(organization_id,app_id,user_id,role) VALUES($1,$2,$3,'developer')",[f.organizationId,sales.app.id,f.users.ai]);
  assert.equal((await f.call('ai','GET',base)).status,404);
  assert.equal((await f.call('ai','GET',base+'/screenshot')).status,404);
  assert.equal((await f.call('ai','POST',base+'/actions',{type:'reload'})).status,404);
 });
 await t.test('unknown PROD, URL and server command selectors cannot enter the gateway',async()=>{
  for(const extra of [{environment:'production'},{url:'http://169.254.169.254/'},{command:'whoami'}])assert.equal((await f.call('developer','POST','/apps/'+sales.app.id+'/debug-sessions',{versionId:sales.version.id,...extra})).status,400);
  assert.equal((await f.call('developer','POST',base+'/actions',{type:'shell',command:'whoami'})).status,400);
  const production=await f.pool.query("SELECT id FROM query_jobs WHERE organization_id=$1 AND app_version_id=$2 AND environment='production'",[f.organizationId,sales.version.id]);assert.equal(production.rowCount,0);
 });
 await t.test('revoked dataset grant blocks cached screenshot and browser commands',async()=>{
  await f.pool.query("DELETE FROM resource_grants WHERE organization_id=$1 AND principal_user_id=$2 AND resource_id=$3 AND action='dataset.query.test'",[f.organizationId,f.users.developer,sales.dataset.id]);
  assert.equal((await f.call('developer','GET',base+'/screenshot')).status,404);
  assert.equal((await f.call('developer','POST',base+'/actions',{type:'reload'})).status,404);
  const audits=await f.pool.query('SELECT count(*)::int AS count FROM query_audits WHERE organization_id=$1 AND app_id=$2',[f.organizationId,sales.app.id]);assert.ok(audits.rows[0].count>0);
  for(const token of Object.values(f.tokens))assert.ok(!JSON.stringify(f.logs).includes(token));
 });
 assert.equal((await f.call('developer','GET','/debug-sessions/'+randomUUID())).status,404);
});
