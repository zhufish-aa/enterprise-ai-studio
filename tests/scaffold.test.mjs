import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createApp } from '../apps/platform-api/dist/app.js';
import { capability as query, assertExecutionDisabled as denyQuery } from '../services/query-worker/dist/index.js';
import { capability as build, assertExecutionDisabled as denyBuild } from '../services/build-worker/dist/index.js';
// Harness integration testing is explicitly performed by the user in stage05.
test('API exposes liveness, keeps readiness closed, and has no production route', async () => {
  const app=await createApp();
  try {
    const fastify=app.getHttpAdapter().getInstance();
    const health=await fastify.inject({method:'GET',url:'/v1/healthz'});
    assert.equal(health.statusCode,200);
    assert.equal(typeof health.headers['x-request-id'],'string');
    assert.deepEqual(health.json(),{status:'ok',service:'platform-api',stage:'architecture'});
    const ready=await fastify.inject({method:'GET',url:'/v1/readyz'});
    assert.equal(ready.statusCode,503);
    assert.equal(ready.json().error.code,'STAGE00_EXECUTION_DISABLED');
    assert.equal(typeof ready.json().error.requestId,'string');
    const business=await fastify.inject({method:'POST',url:'/v1/runtime/apps/00000000-0000-4000-8000-000000000001/queries',payload:{environment:'production',sql:'select 1'}});
    assert.equal(business.statusCode,404);
  } finally { await app.close(); }
});
test('query and build workers cannot consume or execute tasks', () => {
  for(const [capability,deny] of [[query,denyQuery],[build,denyBuild]]) {
    assert.equal(capability.executionEnabled,false);
    assert.throws(deny,/STAGE00_EXECUTION_DISABLED/);
  }
});
