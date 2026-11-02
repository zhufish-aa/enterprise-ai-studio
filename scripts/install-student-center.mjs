import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
const access = JSON.parse(await readFile('work/local-access.json', 'utf8')),
  ready = JSON.parse(await readFile('work/server-final-ready.json', 'utf8')),
  recordPath = 'work/student-center-install.json';
let record;
try {
  record = JSON.parse(await readFile(recordPath, 'utf8'));
} catch {
  record = {};
}
const save = () => writeFile(recordPath, JSON.stringify(record, null, 2) + '\n', { mode: 0o600 });
let pool,
  token = access.accounts.admin.token,
  temporaryHash;
const request = async (path, body, key = randomUUID()) => {
  const response = await fetch(ready.apiUrl + '/v1' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'X-Organization-Id': access.organizationId,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json', 'Idempotency-Key': key }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const r = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(r.error?.message ?? 'Platform request failed'), {
      code: r.error?.code,
      status: response.status,
      details: r.error?.details,
    });
  return r;
};
try {
  try {
    await request('/me');
  } catch (error) {
    if (error.status !== 401) throw error;
    const directory = resolve('work/postgres-0686f772-1c73-4eca-886a-f37706b8c7da'),
      port = Number(
        (await readFile(resolve(directory, 'data/postmaster.pid'), 'utf8')).split(/\r?\n/)[3],
      ),
      password = (await readFile(resolve(directory, 'password'), 'utf8')).trim();
    pool = new pg.Pool({
      host: '127.0.0.1',
      port,
      user: 'postgres',
      password,
      database: 'postgres',
    });
    token = 'eas_local_' + randomBytes(32).toString('base64url');
    temporaryHash = createHash('sha256').update(token).digest('hex');
    await pool.query(
      "INSERT INTO auth_sessions(token_hash,user_id,client_kind,expires_at) VALUES($1,$2,'human',now()+interval '30 minutes')",
      [temporaryHash, access.accounts.admin.userId],
    );
    await pool.query(
      "INSERT INTO audit_logs(organization_id,actor_user_id,action,outcome,request_id,safe_metadata) VALUES($1,$2,'local.install.student-center','allow',$3,$4)",
      [
        access.organizationId,
        access.accounts.admin.userId,
        randomUUID(),
        JSON.stringify({ purpose: 'User-requested site creation', temporarySession: true }),
      ],
    );
  }
  if (!record.appId) {
    const apps = await request('/apps'),
      existing = apps.items.find((a) => a.key === 'student_affairs_center');
    if (existing)
      throw new Error(
        'A student-affairs app already exists; preserve its workspace and inspect before continuing.',
      );
    const app = await request('/apps', {
      key: 'student_affairs_center',
      name: '学生事务中心',
      description: '学生档案、证明模板、证明开具与打印。独立部门账号。',
      type: 'SITE',
      datasetRefs: [],
      workspaceId: 'server:student-affairs',
    });
    record.appId = app.id;
    await save();
  }
  const folder = resolve('sites/student-affairs'),
    files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else
        files.push({
          path: relative(folder, path).replaceAll('\\', '/'),
          content: await readFile(path, 'utf8'),
        });
    }
  }
  await collect(resolve(folder, 'src'));
  files.push(
    {
      path: 'studio.manifest.json',
      content: await readFile(resolve(folder, 'studio.manifest.json'), 'utf8'),
    },
    { path: 'package.json', content: await readFile(resolve(folder, 'package.json'), 'utf8') },
  );
  files.sort((a, b) => a.path.localeCompare(b.path));
  const sourceHash = createHash('sha256').update(JSON.stringify(files)).digest('hex');
  if (record.sourceHash !== sourceHash) {
    let workspace = await request('/apps/' + record.appId + '/workspace');
    if (record.workspaceRevision !== undefined && workspace.revision !== record.workspaceRevision)
      throw new Error('Workspace changed outside this installation; merge before updating.');
    workspace = await request('/apps/' + record.appId + '/workspace/write', {
      revision: workspace.revision,
      files,
    });
    record.workspaceRevision = workspace.revision;
    await save();
    const committed = await request('/apps/' + record.appId + '/workspace/commit', {
      revision: workspace.revision,
      message: process.argv[2] ?? '学生事务中心：独立账号、学生档案、证明模板与打印',
    });
    record.workspaceRevision = committed.workspace.revision;
    record.versionId = committed.version.id;
    record.version = committed.version.version;
    record.sourceHash = sourceHash;
    record.buildId = null;
    await save();
  }
  if (!record.buildId) {
    const build = await request('/app-versions/' + record.versionId + '/builds', {});
    record.buildId = build.id;
    await save();
  }
  let build;
  for (let i = 0; i < 120; i++) {
    build = await request('/build-jobs/' + record.buildId);
    if (['succeeded', 'failed', 'cancelled'].includes(build.status)) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (build?.status !== 'succeeded')
    throw Object.assign(new Error('Site build did not succeed'), {
      code: build?.failureCode,
      details: build?.logs,
    });
  if (!record.adminPassword) {
    record.adminUsername = 'admin';
    record.adminPassword = 'Stu-' + randomBytes(7).toString('hex');
    record.enableKey = randomUUID();
    await save();
  }
  await request(
    '/apps/' + record.appId + '/student-center/enable',
    {
      departmentName: '学生事务中心',
      schoolName: '',
      adminUsername: record.adminUsername,
      adminPassword: record.adminPassword,
    },
    record.enableKey,
  );
  const share = await request('/apps/' + record.appId + '/sharing');
  const saved =
    share.visibility === 'public' && share.appVersionId === record.versionId
      ? share
      : await request('/apps/' + record.appId + '/sharing', {
          visibility: 'public',
          appVersionId: record.versionId,
          expectedRevision: share.revision,
        });
  record.shareId = saved.shareId;
  record.url = new URL(saved.sharePath, access.webUrl).href;
  record.managementUrl = access.webUrl + '/?app=' + record.appId + '&version=' + record.versionId;
  record.installedAt = new Date().toISOString();
  await save();
  console.log(
    JSON.stringify(
      {
        appId: record.appId,
        version: record.version,
        buildStatus: build.status,
        url: record.url,
        managementUrl: record.managementUrl,
        sourceFiles: files.length,
        businessData: 'preserved',
        credentialsFile: resolve(recordPath),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify({ message: error.message, code: error.code, details: error.details }, null, 2),
  );
  process.exitCode = 1;
} finally {
  if (pool) {
    if (temporaryHash)
      await pool.query('UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1', [
        temporaryHash,
      ]);
    await pool.end();
  }
}
