import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import pg from 'pg';
import {createGatewayFixture,waitQuery} from '../scripts/gateway-fixture.mjs';

test('stage03 secure gateway: real PostgreSQL, HTTP identities and isolated connector',async t=>{
 const f=await createGatewayFixture();t.after(()=>f.close());const observed=[];
 const call=async(...args)=>{const r=await f.call(...args);observed.push(r.body);return r;};const ok=(r,status=200)=>{assert.equal(r.status,status,JSON.stringify(r.body));return r.body;};
 const submit=async(query=f.query(),user='developer',path='/queries/test')=>ok(await call(user,'POST',path,{query}),202);
 const execute=async(query=f.query(),user='developer')=>waitQuery(f,user,(await submit(query,user)).id);
 const jobCount=async()=>Number((await f.pool.query('SELECT count(*) FROM query_jobs')).rows[0].count);
 const policy=async(relation,patch)=>ok(await call('admin','POST','/datasets/'+f.datasets[relation].dataset.id+'/query-policies',{...f.policyBase,datasetVersionId:f.datasets[relation].version.id,requireDatabaseRls:relation==='secure_orders',...patch}));
 const activeSlow=async()=>Number((await f.pool.query("SELECT count(*) FROM pg_stat_activity WHERE datname='source_test' AND usename='eas_source_reader' AND state='active' AND query LIKE '%\"slow_records\"%'")).rows[0].count);
 const waitFor=async(fn,ms=3000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,30));}assert.fail('Boundary did not become observable in '+ms+'ms');};
 let early;
 await t.test('complete authorized DSL chain returns only own organization and department, masked before transport',async()=>{
  early=await execute();assert.equal(early.status,'succeeded');assert.deepEqual(early.result.rows.map(r=>r[0]),[1,2]);assert.deepEqual(early.result.rows.map(r=>Number(r[3])),[120,80]);assert.ok(early.result.rows.every(r=>r[1]==='east'&&r[2]==='***test'));assert.equal(early.result.columns.find(c=>c.key==='email').masked,true);
  const stored=(await f.pool.query('SELECT result FROM query_jobs WHERE id=$1',[early.id])).rows[0].result;assert.equal(JSON.stringify(stored).includes('east-one@company.test'),false);
  const metric=await execute(f.query('secure_orders',{dimensions:['department_key'],metrics:['paid_total'],groupBy:['department_key'],orderBy:[],timeRange:{fieldKey:'occurred_at',from:'2026-10-01T00:00:00Z',to:'2026-10-03T00:00:00Z'}}));assert.equal(metric.status,'succeeded');assert.deepEqual(metric.result.rows.map(r=>[r[0],Number(r[1])]),[['east',120]]);
 });
 await t.test('SQL injection is bound as a value, functions/identifiers are rejected before execution',async()=>{
  const injected=await execute(f.query('secure_orders',{filters:[{fieldKey:'department_key',operator:'eq',value:"east' OR 1=1; DROP TABLE sales.secure_orders; --"}]}));assert.equal(injected.status,'succeeded');assert.deepEqual(injected.result.rows,[]);assert.equal((await f.sourcePool.query('SELECT count(*) FROM sales.secure_orders')).rows[0].count,'4');
  const count=await jobCount();for(const q of [f.query('secure_orders',{dimensions:['pg_sleep(2)']}),f.query('secure_orders',{functions:['pg_read_file']}),f.query('secure_orders',{orderBy:[{key:'order_id',direction:'desc;DROP TABLE x'}]}),f.query('secure_orders',{filters:[{fieldKey:'email',operator:'eq',value:'east-one@company.test'}]})])assert.ok([400,422].includes((await call('developer','POST','/queries/test',{query:q})).status));assert.equal(await jobCount(),count);
 });
 await t.test('department escalation and cross-user cached/job/cursor data leakage are blocked',async()=>{
  assert.deepEqual((await execute(f.query('secure_orders',{filters:[{fieldKey:'department_key',operator:'eq',value:'west'}]}))).result.rows,[]);
  const other=await execute(f.query(),'limited');assert.deepEqual(other.result.rows.map(r=>r[0]),[3]);assert.equal(other.result.rows[0][2],'***test');assert.equal((await call('limited','GET','/query-jobs/'+early.id)).status,404);
  const first=await execute(f.query('secure_orders',{limit:1,pagination:{pageSize:1}}));assert.equal(first.result.rows[0][0],1);assert.ok(first.result.nextCursor);
  const next=await execute(f.query('secure_orders',{limit:1,pagination:{pageSize:1,cursor:first.result.nextCursor}}));assert.equal(next.result.rows[0][0],2);
  assert.equal((await call('limited','POST','/queries/test',{query:f.query('secure_orders',{limit:1,pagination:{pageSize:1,cursor:first.result.nextCursor}})})).status,403);
 });
 await t.test('TEST cannot select PROD; a real but unapproved report has no production path',async()=>{
  const appId=randomUUID(),reportId=randomUUID(),versionId=randomUUID();await f.pool.query("INSERT INTO resources(id,organization_id,kind) VALUES($1,$3,'app'),($2,$3,'report')",[appId,reportId,f.organizationId]);await f.pool.query("INSERT INTO apps(id,organization_id,key,name,owner_user_id) VALUES($1,$2,'unapproved','未审批应用',$3)",[appId,f.organizationId,f.users.admin]);await f.pool.query("INSERT INTO reports(id,organization_id,app_id,key,name) VALUES($1,$2,$3,'unapproved','未审批报表')",[reportId,f.organizationId,appId]);await f.pool.query("INSERT INTO report_versions(id,organization_id,report_id,app_id,version,config,config_digest) VALUES($1,$2,$3,$4,1,'{}','unapproved')",[versionId,f.organizationId,reportId,appId]);
  const count=await jobCount();assert.equal((await call('developer','POST','/queries/test',{query:f.query(),environment:'production'})).status,400);assert.equal((await call('developer','POST','/queries/test',{query:{...f.query(),environment:'PROD'}})).status,400);
  assert.equal((await call('developer','POST','/runtime/reports/'+reportId+'/queries',{queryKey:'main',filters:[]})).status,403);assert.equal((await call('developer','POST','/runtime/apps/'+appId+'/queries',{query:f.query()})).status,403);assert.equal(await jobCount(),count);assert.equal((await f.pool.query("SELECT count(*) FROM query_jobs WHERE environment='production'")).rows[0].count,'0');
 });
 await t.test('legacy catalog preview is closed, not a policy bypass',async()=>{
  const count=await jobCount();assert.equal((await call('developer','POST','/datasets/'+f.datasets.secure_orders.dataset.id+'/preview',{datasetVersionId:f.datasets.secure_orders.version.id,dimensions:['amount'],metrics:[],filters:[],limit:100})).status,410);assert.equal(await jobCount(),count);
 });
 await t.test('invalid IDs and parameter types do not create executable work',async()=>{
  const count=await jobCount();for(const query of [f.query('secure_orders',{datasetId:'not-uuid'}),f.query('secure_orders',{limit:'100'}),f.query('secure_orders',{metrics:'paid_total'}),f.query('secure_orders',{filters:[{fieldKey:'amount',operator:'gt',value:'1 OR 1=1'}]}),f.query('secure_orders',{timeRange:{fieldKey:'amount',from:'2026-10-01T00:00:00Z',to:'2026-10-02T00:00:00Z'}})])assert.ok([400,422].includes((await call('developer','POST','/queries/test',{query})).status));assert.equal((await call('developer','POST','/queries/test',{query:f.query('secure_orders',{datasetId:randomUUID()})})).status,404);assert.equal(await jobCount(),count);
 });
 await t.test('field scope applies to selection and underlying metric inputs',async()=>{
  const id=f.datasets.secure_orders.dataset.id,g=f.datasets.secure_orders.grants.developer['dataset.query.test'];ok(await call('admin','DELETE','/resource-grants/'+g.id));const narrow=await f.grant('developer','dataset.query.test',['order_id','department_key','email','status'],['paid_total']);
  const count=await jobCount();assert.equal((await call('developer','POST','/queries/test',{query:f.query()})).status,422);assert.equal((await call('developer','POST','/queries/test',{query:f.query('secure_orders',{dimensions:['department_key'],metrics:['paid_total'],groupBy:['department_key'],orderBy:[]})})).status,422);assert.equal(await jobCount(),count);
  ok(await call('admin','DELETE','/resource-grants/'+narrow.id));f.datasets.secure_orders.grants.developer['dataset.query.test']=await f.grant('developer','dataset.query.test');void id;
 });
 await t.test('revocation blocks existing results and same-idempotency replay, without executing new SQL',async()=>{
  const key=randomUUID(),body={query:f.query()},created=ok(await call('developer','POST','/queries/test',body,{'Idempotency-Key':key}),202);assert.equal((await waitQuery(f,'developer',created.id)).status,'succeeded');
  ok(await call('admin','DELETE','/resource-grants/'+f.datasets.secure_orders.grants.developer['dataset.query.test'].id));const count=await jobCount();assert.equal((await call('developer','GET','/query-jobs/'+created.id)).status,404);assert.equal((await call('developer','POST','/queries/test',body,{'Idempotency-Key':key})).status,404);assert.equal(await jobCount(),count);f.datasets.secure_orders.grants.developer['dataset.query.test']=await f.grant('developer','dataset.query.test');
 });
 await t.test('actual SQL timeout is enforced and over-limit results stay bounded',async()=>{
  const slow=await execute(f.query('slow_records',{dimensions:['order_id','amount'],orderBy:[]}));assert.equal(slow.status,'failed');assert.equal(slow.failureCode,'QUERY_TIMEOUT');assert.equal(slow.result,null);await waitFor(async()=>await activeSlow()===0);
  const requested=await execute(f.query('secure_orders',{limit:5000}));assert.equal(requested.status,'succeeded');assert.equal(requested.result.rows.length,2);
  const large=await execute(f.query('large_records',{limit:3,dimensions:['order_id','amount'],orderBy:[{key:'order_id',direction:'asc'}]}));assert.equal(large.status,'succeeded');assert.equal(large.result.rows.length,3);assert.equal(large.result.truncated,true);
 });
 await t.test('requested rows and pagination cross the former 1000 and 10000 ceilings without weakening data scope',async()=>{
  const query=f.query('large_records',{dimensions:['order_id'],orderBy:[{key:'order_id',direction:'asc'}],limit:11000});
  const direct=await execute(query);assert.equal(direct.status,'succeeded');assert.equal(direct.result.rows.length,11000);assert.equal(direct.result.truncated,true);assert.equal(direct.rowCount,11000);
  const all=structuredClone(query);delete all.limit;const complete=await execute(all);assert.equal(complete.status,'succeeded');assert.equal(complete.result.rows.length,12000);assert.equal(complete.result.truncated,false);
  const validation=await call('developer','POST','/queries/test/validate',{query:all});assert.equal(validation.status,200);assert.equal(validation.body.maxRows,null);
  let cursor=null,total=0;const ids=new Set();for(let index=0;index<3;index++){const page=await execute({...query,limit:5000,pagination:{pageSize:5000,...(cursor?{cursor}:{})}});assert.equal(page.status,'succeeded');for(const row of page.result.rows){assert.ok(!ids.has(row[0]));ids.add(row[0]);}total+=page.result.rows.length;cursor=page.result.nextCursor;}
  assert.equal(total,12000);assert.equal(cursor,null);assert.equal(ids.size,12000);assert.ok([...ids].every(id=>Number(id)>=10001&&Number(id)<=26000));
 });
 await t.test('oversized cells and cumulative result bytes are rejected without returning partial data',async()=>{
  await f.sourcePool.query("INSERT INTO sales.secure_orders SELECT 100+g,$1,'east',$2,'large@company.test',1,'2026-10-01',repeat('x',33000) FROM generate_series(1,40) g",[f.organizationId,f.users.developer]);
  try{const j=await execute(f.query('secure_orders',{dimensions:['order_id','status'],limit:100}));assert.equal(j.status,'failed');assert.equal(j.failureCode,'QUERY_RESULT_TOO_LARGE');assert.equal(j.result,null);assert.equal(j.rowCount,0);}finally{await f.sourcePool.query('DELETE FROM sales.secure_orders WHERE id>=100');}
  await f.sourcePool.query("INSERT INTO sales.secure_orders SELECT 100+g,$1,'east',$2,'large@company.test',1,'2026-10-01',repeat('x',30000) FROM generate_series(1,100) g",[f.organizationId,f.users.developer]);
  try{const j=await execute(f.query('secure_orders',{dimensions:['order_id','status'],limit:200}));assert.equal(j.status,'failed');assert.equal(j.failureCode,'QUERY_RESULT_TOO_LARGE');assert.equal(j.result,null);}finally{await f.sourcePool.query('DELETE FROM sales.secure_orders WHERE id>=100');}
 });
 await t.test('EXPLAIN rejects costly work before the SELECT result is materialized',async()=>{
  await policy('large_records',{maxScanRows:1});const j=await execute(f.query('large_records',{dimensions:['order_id','amount'],limit:3}));assert.equal(j.status,'failed');assert.equal(j.failureCode,'QUERY_COST_REJECTED');assert.equal(j.rowCount,0);assert.equal(j.result,null);await policy('large_records',{});
 });
 await t.test('database-side RLS filters raw reader queries and required RLS cannot be disabled silently',async()=>{
  const reader=new pg.Pool({host:'127.0.0.1',port:f.postgres.port,database:'source_test',user:'eas_source_reader',password:f.readerPassword});try{const c=await reader.connect();try{await c.query('BEGIN READ ONLY');await c.query("SELECT set_config('eas.organization_id',$1,true),set_config('eas.department_codes',$2,true)",[f.organizationId,'["east"]']);assert.deepEqual((await c.query('SELECT id FROM sales.secure_orders ORDER BY id')).rows.map(r=>r.id),[1,2]);await c.query('ROLLBACK');}finally{c.release();}}finally{await reader.end();}
  await f.sourcePool.query('ALTER TABLE sales.secure_orders DISABLE ROW LEVEL SECURITY');try{const j=await execute();assert.equal(j.status,'failed');assert.equal(j.failureCode,'DATABASE_RLS_REQUIRED');assert.equal(j.result,null);}finally{await f.sourcePool.query('ALTER TABLE sales.secure_orders ENABLE ROW LEVEL SECURITY');}
 });
 await t.test('export requires its own grant and applies masks, row scopes, caps, and CSV formula escaping',async()=>{
  assert.equal((await call('developer','POST','/queries/test/exports',{query:f.query()})).status,404);const grant=await f.grant('developer','dataset.export');const largeRequest=ok(await call('developer','POST','/queries/test/exports',{query:f.query('secure_orders',{limit:1501})}),202);assert.equal((await waitQuery(f,'developer',largeRequest.id)).status,'succeeded');
  await f.sourcePool.query("INSERT INTO sales.secure_orders VALUES(5,$1,'east',$2,'private-export@company.test',1,'2026-10-01','=1+1')",[f.organizationId,f.users.developer]);try{
   const created=await submit(f.query('secure_orders',{dimensions:['order_id','email','status'],orderBy:[]}), 'developer','/queries/test/exports');const j=await waitQuery(f,'developer',created.id);assert.equal(j.status,'succeeded');assert.equal(j.result,null);
   const response=await fetch(f.apiUrl+'/v1/query-jobs/'+j.id+'/export',{headers:{Authorization:'Bearer '+f.tokens.developer,'X-Organization-Id':f.organizationId}});const csv=await response.text();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok(csv.includes("'=1+1"));assert.ok(csv.includes('***test'));assert.equal(csv.includes('private-export@company.test'),false);assert.equal(csv.includes('west-private'),false);
   ok(await call('admin','DELETE','/resource-grants/'+grant.id));assert.equal((await call('developer','GET','/query-jobs/'+j.id+'/export')).status,404);
  }finally{await f.sourcePool.query('DELETE FROM sales.secure_orders WHERE id=5');}
 });
 await t.test('busy queries are accepted into the server queue, other users progress and cancellation reaches PostgreSQL',async()=>{
  await policy('slow_records',{timeoutMs:5000});const q=f.query('slow_records',{dimensions:['order_id','amount'],orderBy:[]}),jobs=[];
  for(let index=0;index<10;index++)jobs.push(await submit(q));
  await waitFor(async()=>await activeSlow()===2);
  const states=(await f.pool.query('SELECT status FROM query_jobs WHERE id=ANY($1::uuid[])',[jobs.map(job=>job.id)])).rows;assert.equal(states.filter(row=>row.status==='running').length,2);assert.equal(states.filter(row=>row.status==='queued').length,8);
  const other=await submit(f.query(),'limited');
  // Cancel waiting jobs before running jobs release execution slots.
  for(const job of [...jobs].reverse()){const r=ok(await call('developer','POST','/query-jobs/'+job.id+'/cancel'));assert.equal(r.status,'cancelled');assert.equal(r.result,null);}
  await waitFor(async()=>await activeSlow()===0,2500);for(const job of jobs)assert.equal((await waitQuery(f,'developer',job.id)).status,'cancelled');
  const otherResult=await waitQuery(f,'limited',other.id);assert.equal(otherResult.status,'succeeded');assert.deepEqual(otherResult.result.rows.map(row=>row[0]),[3]);
 });
 await t.test('connection interruption fails safely and the next query reconnects',async()=>{
  const j=await submit(f.query('slow_records',{dimensions:['order_id','amount'],orderBy:[]}));await waitFor(async()=>await activeSlow()>0);await f.pool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='source_test' AND usename='eas_source_reader' AND state='active' AND query LIKE '%\"slow_records\"%'");const result=await waitQuery(f,'developer',j.id);assert.equal(result.status,'failed');assert.equal(result.failureCode,'CONNECTION_LOST');assert.equal(result.result,null);assert.equal((await execute()).status,'succeeded');
 });
 await t.test('department scope changes cancel in-flight SQL and invalidate prior results',async()=>{
  const j=await submit(f.query('slow_records',{dimensions:['order_id','amount'],orderBy:[]}));await waitFor(async()=>await activeSlow()>0);
  ok(await call('admin','POST','/organizations/'+f.organizationId+'/members/'+f.users.developer+'/data-scope',{departmentCodes:['west']}));
  await waitFor(async()=>{const row=(await f.pool.query('SELECT status,result FROM query_jobs WHERE id=$1',[j.id])).rows[0];return row.status==='failed'&&row.result===null;});await waitFor(async()=>await activeSlow()===0,2500);assert.equal((await call('developer','GET','/query-jobs/'+j.id)).status,403);const current=await execute();assert.deepEqual(current.result.rows.map(r=>r[0]),[3]);
  ok(await call('admin','POST','/organizations/'+f.organizationId+'/members/'+f.users.developer+'/data-scope',{departmentCodes:['east']}));
 });
 await t.test('unmask needs both a current role action and an explicit field grant',async()=>{
  const g=await f.grant('developer','dataset.unmask',['email'],[]);assert.equal((await execute()).result.rows[0][2],'***test');const role=(await f.pool.query('SELECT role_id FROM role_bindings WHERE organization_id=$1 AND user_id=$2',[f.organizationId,f.users.developer])).rows[0].role_id;await f.pool.query("INSERT INTO role_permissions(organization_id,role_id,permission_key) VALUES($1,$2,'dataset.unmask')",[f.organizationId,role]);
  const clear=await execute();assert.equal(clear.result.rows[0][2],'east-one@company.test');ok(await call('admin','DELETE','/resource-grants/'+g.id));assert.equal((await call('developer','GET','/query-jobs/'+clear.id)).status,403);assert.equal((await execute()).result.rows[0][2],'***test');
 });
 // Approved production success, revoke, drift and rollback are now exercised through real stage06 HTTP workflow tests.
 await t.test('diagnostic validation has no admin bypass and query audit is value-free and immutable',async()=>{
  assert.equal((await call('developer','POST','/queries/diagnostics/validate',{query:f.query()})).status,403);assert.equal(ok(await call('admin','POST','/queries/diagnostics/validate',{query:f.query()})).valid,true);assert.equal((await call('developer','GET','/query-audits')).status,403);
  const audits=ok(await call('admin','GET','/query-audits')).items;assert.ok(audits.some(a=>a.permissionResult==='deny'));assert.ok(audits.some(a=>a.slow));assert.ok(audits.some(a=>a.rowCount===2));assert.ok(audits.every(a=>a.traceId&&a.userId&&a.datasetId!==undefined));const serialized=JSON.stringify({audits,logs:f.logs,observed});for(const secret of ['east-one@company.test','west-private@company.test',f.readerPassword,'local:sales-reader','postgresql://'])assert.equal(serialized.includes(secret),false,secret);
  await assert.rejects(f.pool.query("UPDATE query_audits SET status='forged'"),e=>e.code==='23514');
 });
 await writeFile('work/stage03-real-results.json',JSON.stringify({verifiedAt:new Date().toISOString(),postgresVersion:f.postgres.version,realGateway:'test HTTP identity -> current resource/department policy -> DSL -> isolated connector -> PostgreSQL RLS + parameterized SQL -> masked result',production:'unapproved app/report paths rejected before a production query job; no production database instance validated',cache:'no shared result cache; job owner and cursor audience tested'},null,2));
});
