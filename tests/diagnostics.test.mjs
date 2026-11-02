import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {setImmediate} from 'node:timers/promises';
import {PlatformClient,PlatformError,PreviewQueryQueue,schemaFailureDetails} from '../packages/platform-sdk/dist/index.js';

test('SDK preserves actionable field errors, operation, HTTP status and trace without copying raw error messages',async t=>{
 const secret='private-value-never-display';
 const server=createServer((_req,res)=>{res.writeHead(422,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'INVALID_FILTER_BINDING',message:'postgresql://user:'+secret+'@private-db',requestId:'req-test-1',details:[{field:'timeRange.fieldKey',reason:'查询 daily_trend 未配置 order_date 日期字段。'}],password:secret},traceId:'f4c6a551-23b4-436d-8715-af99e164e871'}));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const logs=[],client=new PlatformClient({apiUrl:'http://127.0.0.1:'+server.address().port,organizationId:'00000000-0000-4000-8000-000000000001',token:async()=>secret,allowLocalHttp:true,log:entry=>logs.push(entry)});
 await assert.rejects(()=>client.request('/apps/test/queries',{method:'POST',body:{queryKey:'daily_trend',filters:[]}}),error=>{
  assert.ok(error instanceof PlatformError);assert.equal(error.code,'INVALID_FILTER_BINDING');assert.equal(error.status,422);
  assert.match(error.message,/daily_trend/);assert.match(error.message,/order_date/);assert.match(error.message,/处理方法/);assert.match(error.message,/POST \/apps\/test\/queries/);assert.match(error.message,/req-test-1/);assert.match(error.message,/f4c6a551/);assert.ok(!error.message.includes(secret));return true;
 });
 assert.ok(!JSON.stringify(logs).includes(secret));assert.deepEqual(logs,[{method:'POST',status:422,code:'INVALID_FILTER_BINDING'}]);
});

test('SDK distinguishes deadline, cancellation, invalid responses and unreadable token storage',async t=>{
 const server=createServer((req,res)=>{if(req.url.endsWith('/html')){res.writeHead(502,{'Content-Type':'text/html'});res.end('<html>proxy unavailable</html>');return;}setTimeout(()=>{res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');},150);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>{server.closeAllConnections();server.close();});
 const options={apiUrl:'http://127.0.0.1:'+server.address().port,organizationId:'00000000-0000-4000-8000-000000000001',token:async()=>'test-token',allowLocalHttp:true};
 await assert.rejects(()=>new PlatformClient({...options,timeoutMs:20}).request('/slow'),error=>error.code==='REQUEST_TIMEOUT'&&error.message.includes('超时'));
 await assert.rejects(()=>new PlatformClient(options).request('/html'),error=>error.code==='PLATFORM_INVALID_RESPONSE'&&error.status===502);
 const abort=new AbortController();abort.abort();await assert.rejects(()=>new PlatformClient(options).request('/slow',{signal:abort.signal}),error=>error.code==='REQUEST_CANCELLED');
 await assert.rejects(()=>new PlatformClient({...options,token:async()=>{throw new Error('ENOENT /private/token');}}).request('/slow'),error=>error.code==='TOKEN_STORE_UNAVAILABLE'&&!error.message.includes('/private/token'));
});

test('tool parameter diagnostics identify the field and required type without echoing input values',()=>{
 assert.deepEqual(schemaFailureDetails([{instancePath:'',keyword:'required',params:{missingProperty:'appId'}},{instancePath:'/revision',keyword:'type',params:{type:'integer'}},{instancePath:'',keyword:'additionalProperties',params:{additionalProperty:'credential-private-value'}}]),[{field:'/appId',reason:'缺少必填字段'},{field:'/revision',reason:'字段类型不正确，应为 integer'},{field:'/',reason:'包含接口未定义的字段'}]);
});

test('preview queue executes all chart requests at concurrency two instead of rejecting extra charts',async()=>{
 const queue=new PreviewQueryQueue(2),release=[],started=[],finished=[];let running=0,peak=0;
 for(let index=0;index<7;index++)assert.equal(queue.enqueue(String(index),async()=>{started.push(index);running++;peak=Math.max(peak,running);await new Promise(resolve=>release[index]=resolve);running--;finished.push(index);}),true);
 await setImmediate();assert.deepEqual(started,[0,1]);
 for(let index=0;index<7;index++){release[index]();await setImmediate();}
 assert.equal(peak,2);assert.deepEqual(finished,[0,1,2,3,4,5,6]);assert.equal(running,0);queue.close();
});

test('queued cancellation never starts an API operation and closing aborts the active operation',async()=>{
 const queue=new PreviewQueryQueue(1,3);let signal,release,queuedRan=false;
 queue.enqueue('active',async value=>{signal=value;await new Promise(resolve=>release=resolve);});
 queue.enqueue('cancel-before-start',async()=>{queuedRan=true;});
 assert.equal(queue.enqueue('active',async()=>{}),false);await setImmediate();queue.cancel('cancel-before-start');queue.close();assert.equal(signal.aborted,true);release();await setImmediate();assert.equal(queuedRan,false);assert.equal(queue.enqueue('after-close',async()=>{}),false);
});

test('preview queue accepts more than the former 64 waiting chart requests',async()=>{
 const queue=new PreviewQueryQueue(1);let release;const running=new Promise(resolve=>release=resolve);queue.enqueue('active',async()=>running);
 for(let index=0;index<100;index++)assert.equal(queue.enqueue('waiting-'+index,async()=>{}),true);
 assert.equal([...queue.pendingIds()].length,101);queue.close();release();await setImmediate();
});
