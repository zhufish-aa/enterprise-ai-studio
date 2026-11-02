import {
  cp,
  mkdir,
  readFile,
  readdir,
  realpath,
  symlink,
  writeFile,
  lstat,
  chmod,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const destination = resolve(process.argv[2] ?? 'work/site-runtime-image');
const rootfs = join(destination, 'rootfs');
const store = await realpath('node_modules/.pnpm');
const copied = new Set();

async function copyStorePackage(path) {
  const actual = await realpath(path);
  const inside = relative(store, actual);
  if (inside.startsWith('..') || inside === '') throw new Error('Unexpected runtime dependency');
  const packageDirectory = inside.split('/')[0];
  if (copied.has(packageDirectory)) return;
  copied.add(packageDirectory);
  const from = join(store, packageDirectory);
  await cp(from, join(rootfs, 'runtime/node_modules/.pnpm', packageDirectory), {
    recursive: true,
    verbatimSymlinks: true,
  });
  const modules = join(from, 'node_modules');
  for (const entry of await readdir(modules, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const target = join(modules, entry.name);
    if (entry.isSymbolicLink()) await copyStorePackage(target);
    else if (entry.name.startsWith('@')) {
      for (const child of await readdir(target, { withFileTypes: true })) {
        if (child.isSymbolicLink()) await copyStorePackage(join(target, child.name));
      }
    }
  }
}

await mkdir(join(rootfs, 'runtime/node_modules'), { recursive: true });
for (const name of [
  'fastify',
  'pg',
  'ajv',
  'docx',
  'docxtemplater',
  'exceljs',
  'pizzip',
  '@xmldom/xmldom',
]) {
  const actual = await realpath('sites/student-affairs/node_modules/' + name);
  await copyStorePackage(actual);
  const link = join(rootfs, 'runtime/node_modules', name);
  await mkdir(dirname(link), { recursive: true });
  const target = relative(
    dirname(link),
    join(rootfs, 'runtime/node_modules/.pnpm', relative(store, actual)),
  );
  await symlink(target, link).catch((error) => {
    if (error.code !== 'EEXIST') throw error;
  });
}

const { stdout } = await run('ldd', [process.execPath]);
const libraries = new Set(stdout.match(/\/[\w./+-]+/g) ?? []);
for (const path of [process.execPath, ...libraries]) {
  const target =
    path === process.execPath ? join(rootfs, 'opt/node24/bin/node') : join(rootfs, path);
  await mkdir(dirname(target), { recursive: true });
  await cp(path, target, { dereference: true });
}
await mkdir(join(rootfs, 'etc'), { recursive: true });
await mkdir(join(rootfs, 'tmp'), { recursive: true });
await writeFile(join(rootfs, 'etc/passwd'), 'site:x:10001:10001:Site runtime:/tmp:/nonexistent\n');
await writeFile(join(rootfs, 'etc/group'), 'site:x:10001:\n');
await writeFile(join(rootfs, 'etc/nsswitch.conf'), 'hosts: files dns\n');
// The image contains only public runtime dependencies, never site credentials.
// Normalize pnpm-store permissions so the unprivileged runtime can read packages.
async function readable(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink()) return;
  if (info.isDirectory()) {
    await chmod(path, 0o555);
    for (const entry of await readdir(path)) await readable(join(path, entry));
  } else await chmod(path, 0o444 | (info.mode & 0o111));
}
await readable(rootfs);
await writeFile(join(destination, 'Dockerfile'), 'FROM scratch\nCOPY rootfs/ /\n');
console.log(
  JSON.stringify({ context: destination, dependencyPackages: copied.size, node: process.version }),
);
