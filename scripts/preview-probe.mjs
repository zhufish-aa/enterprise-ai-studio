import { readFile, writeFile } from 'node:fs/promises';
/** Local acceptance probe, never invoked by the platform API or the Harness plugin. */
const access = JSON.parse(await readFile('work/local-access.json', 'utf8'));
const call = async (method, path, body) => {
  const res = await fetch(access.apiUrl + '/v1' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + access.accounts.developer.token,
      'X-Organization-Id': access.organizationId,
      ...(method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Probe API ' + res.status);
  return data;
};
const app = await call('POST', '/apps', {
  key: 'preview_isolation_probe',
  name: '预览隔离自检',
  type: 'SITE',
  description: '仅测试沙箱中的父页面、存储与网络拒绝，不访问业务数据。',
  datasetRefs: [],
  workspaceId: 'preview-isolation-probe',
});
const content = `const result:Record<string,boolean|string>={};
try{void window.parent.document.body;result.parentDocumentBlocked=false;}catch(e){result.parentDocumentBlocked=e instanceof DOMException&&e.name==='SecurityError';}
try{void window.localStorage.length;result.storageBlocked=false;}catch(e){result.storageBlocked=e instanceof DOMException&&e.name==='SecurityError';}
result.opaqueOrigin=window.origin==='null';
fetch('http://127.0.0.1:5173/v1/healthz',{signal:AbortSignal.timeout(3000)}).then(()=>{result.networkBlocked=false;}).catch(()=>{result.networkBlocked=true;}).finally(()=>{document.body.textContent=JSON.stringify(result,null,2);});
`;
const version = await call('POST', '/apps/' + app.id + '/versions', {
  manifest: { schemaVersion: '1.0', entrypoint: 'src/main.tsx', datasetRefs: [], queries: [] },
  files: [{ path: 'src/main.tsx', content }],
  message: '真实浏览器隔离探针',
});
let build = await call('POST', '/app-versions/' + version.id + '/builds');
for (let i = 0; i < 150 && !['succeeded', 'failed'].includes(build.status); i++) {
  await new Promise((r) => setTimeout(r, 200));
  build = await call('GET', '/build-jobs/' + build.id);
}
if (build.status !== 'succeeded') throw new Error('Probe build failed');
const url = access.webUrl + '/?section=apps&app=' + app.id + '&version=' + version.id;
await writeFile(
  'work/preview-probe.json',
  JSON.stringify({ url, appId: app.id, versionId: version.id }),
);
console.log(url);
