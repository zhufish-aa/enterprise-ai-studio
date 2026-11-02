import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {AdapterRegistry,resolveApprovedAddress} from '../packages/database-adapters/dist/index.js';
import {SignatureVerifier,signedHeaders,signedRequest} from '../packages/connector-transport/dist/index.js';

const endpoint={id:randomUUID(),organizationId:randomUUID(),createdAt:new Date().toISOString(),name:'timeout fixture',environment:'test',engine:'postgresql',host:'127.0.0.1',port:5432,allowedCidrs:['127.0.0.1/32'],tlsServerName:'localhost',tlsMode:'disable-fixture',allowedDatabases:['fixture'],allowedRelations:[{schema:'sales',name:'orders'}],localFixture:true,caRef:null};
const plan=()=>({jobId:randomUUID(),organizationId:endpoint.organizationId,attempt:1,expiresAt:new Date(Date.now()+10000).toISOString(),environment:'test',operation:'health',policyEpoch:1,connection:{id:randomUUID(),engine:'postgresql',databaseName:'fixture',secretRef:'local:fixture',credentialRevision:1,connectTimeoutMs:150,requestTimeoutMs:200,poolMax:1,endpoint:{...endpoint}},relations:[],preview:null});
const secrets={async credential(){return {username:'fixture',password:'private-fixture',revision:'1'};},async certificate(){throw new Error('not configured');}};
test('connector signatures bind body/path and reject replay or network downgrade',async()=>{
 const key='a'.repeat(64),body={jobId:randomUUID()},verifier=new SignatureVerifier(),headers=signedHeaders(key,'POST','/execute',body);
 assert.throws(()=>verifier.verify(key,'POST','/execute',{...body,environment:'production'},headers));
 assert.throws(()=>verifier.verify(key,'POST','/lease',body,headers));
 verifier.verify(key,'POST','/execute',body,headers);assert.throws(()=>verifier.verify(key,'POST','/execute',body,headers));
 await assert.rejects(signedRequest(new URL('http://10.1.1.1/execute'),key,body,{allowLocalHttp:true}),/MTLS_REQUIRED/);
});
test('DNS pinning rejects mixed allowed/forbidden answers, mapped IPv6 and production fixtures',async()=>{
 await assert.rejects(resolveApprovedAddress({...endpoint,host:'db.example.internal'},true,async()=>[{address:'127.0.0.1',family:4},{address:'10.1.1.2',family:4}]),/NETWORK_ADDRESS_FORBIDDEN/);
 await assert.rejects(resolveApprovedAddress({...endpoint,host:'::ffff:127.0.0.1',allowedCidrs:['::/0']},true),/NETWORK_ADDRESS_FORBIDDEN/);
 await assert.rejects(resolveApprovedAddress({...endpoint,environment:'production'},true),/NETWORK_ADDRESS_FORBIDDEN/);
});
test('actual PostgreSQL driver times out against a nonresponsive TCP server',async t=>{
 const sockets=new Set();const server=net.createServer(socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const registry=new AdapterRegistry(secrets,true);t.after(async()=>{for(const s of sockets)s.destroy();await registry.close();await new Promise(r=>server.close(r));});
 const p=plan();p.connection.endpoint.port=server.address().port;const started=Date.now(),result=await registry.execute(p);
 assert.equal(result.ok,false);assert.equal(result.failureCode,'CONNECTION_TIMEOUT');assert.equal(result.data,null);assert.ok(Date.now()-started<3000);
});
test('pool rotation closes old idle credentials, environment is enforced before any driver',async()=>{
 let revision='1',created=0,closed=0;const registry=new AdapterRegistry({...secrets,async credential(){return {...await secrets.credential(),revision};}},true,{create(){created++;return {async query(){return [{healthy:1}];},async close(){closed++;}};}});
 try{const p=plan();assert.equal((await registry.execute(p)).ok,true);revision='2';assert.equal((await registry.execute(p)).ok,true);assert.equal(created,2);assert.equal(closed,1);assert.equal((await registry.execute({...p,operation:'preview',environment:'production'})).failureCode,'ENVIRONMENT_FORBIDDEN');assert.equal(created,2);}finally{await registry.close();}
});
