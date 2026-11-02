import { mkdir, writeFile, appendFile, realpath, lstat, rm } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve, dirname, basename } from 'node:path';
import net from 'node:net';
export async function unusedPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}
export async function runBinary(exe, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (b) => (out += b));
    child.stderr.on('data', (b) => (out += b));
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0
        ? resolve(out)
        : reject(new Error('PostgreSQL fixture command failed: ' + out.slice(-2000))),
    );
  });
}
export async function startPostgres(options = {}) {
  const binary = await import(
    process.platform === 'win32' ? '@embedded-postgres/windows-x64' : '@embedded-postgres/linux-x64'
  );
  const workRoot = resolve(process.env.EAS_TEST_WORK_DIR ?? 'work'),
    directory = resolve(workRoot, 'postgres-' + randomUUID()),
    data = resolve(directory, 'data'),
    password = randomBytes(24).toString('hex'),
    pwfile = resolve(directory, 'password'),
    preserveData = options.preserveData === true;
  await mkdir(directory, { recursive: true });
  await writeFile(pwfile, password, { mode: 0o600 });
  await runBinary(binary.initdb, [
    '-D',
    data,
    '-U',
    'postgres',
    '--pwfile=' + pwfile,
    '-A',
    'scram-sha-256',
    '--encoding=UTF8',
    '--locale=C',
  ]);
  const port = await unusedPort();
  const host = options.host ?? '127.0.0.1',
    ssl = options.tlsFiles
      ? ` -c ssl=on -c ssl_cert_file="${options.tlsFiles.cert.replaceAll('\\', '/')}" -c ssl_key_file="${options.tlsFiles.key.replaceAll('\\', '/')}" -c ssl_ca_file="${options.tlsFiles.ca.replaceAll('\\', '/')}"`
      : '';
  if (options.tlsFiles && host !== '127.0.0.1')
    await appendFile(
      resolve(data, 'pg_hba.conf'),
      '\nhostssl all all ' + host + '/32 scram-sha-256\n',
    );
  await runBinary(binary.pg_ctl, [
    '-D',
    data,
    '-l',
    resolve(directory, 'server.log'),
    '-o',
    `-h ${host} -p ${port} -c shared_buffers=32MB -c max_connections=60 -c timezone=UTC${ssl}`,
    '-w',
    'start',
  ]);
  let stopped = false;
  return {
    port,
    password,
    directory,
    url: `postgresql://postgres:${password}@${host}:${port}/postgres`,
    version: (await runBinary(binary.postgres, ['--version'])).trim(),
    async stop() {
      if (!stopped) {
        await runBinary(binary.pg_ctl, ['-D', data, '-m', 'fast', '-w', 'stop']);
        stopped = true;
      }
      if (preserveData) return;
      // Delete only the exact temporary directory created by this invocation, after a successful stop.
      // Interactive local demos explicitly opt into preservation; existing business instances are never swept.
      let item;
      try {
        item = await lstat(directory);
      } catch (error) {
        if (error.code === 'ENOENT') return;
        throw error;
      }
      const rootPath = await realpath(workRoot),
        targetPath = await realpath(directory);
      if (
        item.isSymbolicLink() ||
        !item.isDirectory() ||
        dirname(targetPath) !== rootPath ||
        basename(targetPath) !== basename(directory) ||
        !/^postgres-[a-f0-9-]{36}$/.test(basename(targetPath))
      )
        throw new Error('POSTGRES_FIXTURE_CLEANUP_PATH_REJECTED');
      await rm(targetPath, { recursive: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}
