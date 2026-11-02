import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createCatalogFixture} from '../scripts/catalog-fixture.mjs';
import {seedSalesFixture} from '../scripts/sales-fixture.mjs';
import {waitQuery} from '../scripts/gateway-fixture.mjs';
test('server files: real PostgreSQL, revision editing, immutable commit, real sales query and fixed compiler',async t=>{
 const f=await createCatalogFixture({withBuild:true});t.after(()=>f.close());const sales=await seedSalesFixture(f),ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.body));return r.body;};
 const app=ok(await f.call('developer','POST','/apps',{key:'server_sales',name:'服务器销售分析',type:'REPORT',description:'无本地文件上传',workspaceId:'server',datasetRefs:sales.manifest.datasetRefs}),201),base='/apps/'+app.id+'/workspace';
 const get=()=>f.call('developer','GET',base),post=(action,body,headers)=>f.call('developer','POST',base+'/'+action,body,headers),count=async table=>Number((await f.pool.query('SELECT count(*) FROM '+table)).rows[0].count);
 let head,committed;
 await t.test('create and read actual files on the server, independent of local paths',async()=>{
  head=ok(await get());assert.equal(head.revision,0);assert.deepEqual(head.files,[]);
  head=ok(await post('write',{revision:0,files:[...sales.upload.files,{path:'studio.manifest.json',content:JSON.stringify({...sales.manifest,report:undefined})}]}));assert.equal(head.revision,1);
  const file=ok(await post('read',{path:'src/main.tsx'}));assert.equal(file.content,sales.upload.files.find(f=>f.path==='src/main.tsx').content);assert.equal(file.revision,1);
  assert.equal((await f.pool.query('SELECT content FROM app_workspace_files WHERE app_id=$1 AND path=$2',[app.id,'src/main.tsx'])).rows[0].content,file.content);
 });
 await t.test('exact edits and rename/remove change persisted draft, not old versions',async()=>{
  head=ok(await post('write',{revision:head.revision,files:[{path:'src/notes.ts',content:'// first\n// repeated\n// repeated'}]}));const oldRevision=head.revision;
  for(const oldText of ['missing','repeated']){const r=await post('edit',{revision:head.revision,path:'src/notes.ts',oldText,newText:'changed'});assert.equal(r.status,409);assert.equal(ok(await get()).revision,oldRevision);}
  head=ok(await post('edit',{revision:head.revision,path:'src/notes.ts',oldText:'first',newText:'server edited'}));assert.match(ok(await post('read',{path:'src/notes.ts'})).content,/server edited/);
  head=ok(await post('move',{revision:head.revision,from:'src/notes.ts',to:'src/renamed.ts'}));assert.equal((await post('read',{path:'src/notes.ts'})).status,404);
  head=ok(await post('remove',{revision:head.revision,paths:['src/renamed.ts']}));assert.ok(!head.files.some(f=>f.path==='src/renamed.ts'));
 });
 await t.test('concurrent writers cannot silently overwrite each other and rejected batch rolls back',async()=>{
  const revision=head.revision,responses=await Promise.all(['a','b'].map(value=>post('write',{revision,files:[{path:'README.md',content:value}]})));assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);head=ok(await get());assert.equal(head.revision,revision+1);
  const before=ok(await post('read',{path:'README.md'}));const r=await post('write',{revision:head.revision,files:[{path:'README.md',content:'must rollback'},{path:'../system.ts',content:'blocked'}]});assert.equal(r.status,422);assert.equal(ok(await post('read',{path:'README.md'})).content,before.content);assert.equal(ok(await get()).revision,head.revision);
 });
 await t.test('server snapshot commits idempotently to immutable source versions',async()=>{
  const before=await count('app_versions'),key=randomUUID(),body={revision:head.revision,message:'服务器草稿第一版'};committed=ok(await post('commit',body,{'Idempotency-Key':key}));const replay=ok(await post('commit',body,{'Idempotency-Key':key}));assert.equal(replay.version.id,committed.version.id);assert.equal(await count('app_versions'),before+1);head=committed.workspace;
  await assert.rejects(()=>f.pool.query("UPDATE app_versions SET message='overwrite' WHERE id=$1",[committed.version.id]));
 });
 async function build(version){let job=ok(await f.call('developer','POST','/app-versions/'+version.id+'/builds'),202);for(let n=0;n<150&&['queued','running'].includes(job.status);n++){await new Promise(r=>setTimeout(r,150));job=ok(await f.call('developer','GET','/build-jobs/'+job.id));}assert.equal(job.status,'succeeded',JSON.stringify(job));const preview=ok(await f.call('developer','GET','/apps/'+app.id+'/preview/'+version.id));assert.ok(preview.html.includes('<script'));return preview;}
 await t.test('server files build a real preview and query independent sales TEST database',async()=>{
  await build(committed.version);const job=ok(await f.call('developer','POST','/apps/'+app.id+'/preview/'+committed.version.id+'/queries',{queryKey:'summary',filters:[]}),202),result=await waitQuery(f,'developer',job.id);assert.equal(result.status,'succeeded');assert.equal(Number(result.result.rows[0][0]),47040);assert.equal(Number(result.result.rows[0][1]),60);
 });
 await t.test('modify same server project, create second version, and checkout old version without changing history',async()=>{
  const file=ok(await post('read',{path:'src/main.tsx'}));head=ok(await post('write',{revision:head.revision,files:[{path:file.path,content:file.content+'\n// server iteration two\n'}]}));const second=ok(await post('commit',{revision:head.revision,message:'服务器编辑第二版'}));head=second.workspace;assert.equal(second.version.version,2);assert.notEqual(second.version.sourceDigest,committed.version.sourceDigest);await build(second.version);
  head=ok(await post('checkout',{revision:head.revision,versionId:committed.version.id}));assert.equal(ok(await post('read',{path:'src/main.tsx'})).content,file.content);assert.equal(ok(await f.call('developer','GET','/apps/'+app.id+'/versions')).items.length,2);
 });
 await t.test('no unauthorized or cross-tenant file access; revoked membership blocks replay and writes',async()=>{
  const before=ok(await get());for(const user of ['limited','outsider']){assert.ok((await f.call(user,'GET',base)).status>=400);assert.ok((await f.call(user,'POST',base+'/read',{path:'src/main.tsx'})).status>=400);assert.ok((await f.call(user,'POST',base+'/write',{revision:head.revision,files:[{path:'README.md',content:'unauthorized'}]})).status>=400);}assert.equal(ok(await get()).revision,before.revision);
  const key=randomUUID(),body={path:'src/main.tsx'};ok(await post('read',body,{'Idempotency-Key':key}));await f.pool.query('DELETE FROM app_members WHERE organization_id=$1 AND app_id=$2 AND user_id=$3',[f.organizationId,app.id,f.users.developer]);assert.equal((await post('read',body,{'Idempotency-Key':key})).status,404);assert.equal((await post('remove',{revision:head.revision,paths:['src/main.tsx']})).status,404);await f.pool.query("INSERT INTO app_members VALUES($1,$2,$3,'maintainer')",[f.organizationId,app.id,f.users.developer]);
 });
 await t.test('invalid paths, incomplete manifest and oversized content create no version or filesystem side effect',async()=>{
  for(const path of ['C:/Windows/system.ini','/etc/passwd','src/../private.ts','src/.env.ts','node_modules/a.ts','src/nested//a.ts']){const result=await post('write',{revision:head.revision,files:[{path,content:'bad'}]});assert.ok(result.status>=400,path);}
  assert.equal((await post('write',{revision:head.revision,files:[{path:'src/large.ts',content:'界'.repeat(50000)}]})).status,422);
  const before=await count('app_versions');head=ok(await post('write',{revision:head.revision,files:[{path:'studio.manifest.json',content:'{broken'}]}));assert.equal((await post('commit',{revision:head.revision,message:'invalid'})).status,422);assert.equal(await count('app_versions'),before);
  assert.ok(!(await f.pool.query('SELECT path FROM app_workspace_files WHERE app_id=$1',[app.id])).rows.some(r=>r.path.includes('..')));
 });
});
