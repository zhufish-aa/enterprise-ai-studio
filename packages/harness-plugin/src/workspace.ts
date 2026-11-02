import { realpath, readdir, lstat, open } from 'node:fs/promises';
import { relative, resolve, isAbsolute, sep } from 'node:path';
import type { components } from '@eas/api-contract';
type S = components['schemas'];
const inside = (root: string, path: string) => {
  const r = relative(root, path);
  return r === '' || (!r.startsWith('..' + sep) && r !== '..' && !isAbsolute(r));
};
/** Optional local import from an explicitly selected project folder; server editing does not use this path. */
export async function collectProject(
  sessionCwd: string | undefined,
  projectPath: string,
  signal: AbortSignal,
): Promise<S['SourceUpload']> {
  if (
    !projectPath.trim() ||
    projectPath.includes('\0') ||
    (!isAbsolute(projectPath) && !sessionCwd)
  )
    throw new Error('PROJECT_DIRECTORY_REQUIRED');
  let project: string;
  try {
    project = await realpath(
      isAbsolute(projectPath) ? projectPath : resolve(sessionCwd!, projectPath),
    );
  } catch {
    throw new Error('PROJECT_DIRECTORY_NOT_FOUND');
  }

  const files: S['SourceUpload']['files'] = [];
  let bytes = 0,
    count = 0;
  async function read(path: string) {
    signal.throwIfAborted();
    const full = resolve(project, path),
      before = await lstat(full);
    if (
      !before.isFile() ||
      before.isSymbolicLink() ||
      before.nlink !== 1 ||
      before.size > 131072 ||
      !inside(project, await realpath(full))
    )
      throw new Error('WORKSPACE_FILE_REJECTED');
    const handle = await open(full, 'r');
    try {
      const actual = await handle.stat();
      if (actual.dev !== before.dev || actual.ino !== before.ino || actual.nlink !== 1)
        throw new Error('WORKSPACE_FILE_REJECTED');
      const content = await handle.readFile({ encoding: 'utf8' });
      if (!inside(project, await realpath(full)) || content.includes('\0'))
        throw new Error('WORKSPACE_FILE_REJECTED');
      bytes += Buffer.byteLength(content);
      if (bytes > 4 * 1024 * 1024 || ++count > 1000) throw new Error('SOURCE_LIMIT_EXCEEDED');
      return content;
    } finally {
      await handle.close();
    }
  }
  async function walk(dir: string, depth = 0) {
    if (depth > 8) throw new Error('WORKSPACE_PATH_REJECTED');
    const full = resolve(project, dir),
      stat = await lstat(full);
    if (stat.isSymbolicLink() || !inside(project, await realpath(full)))
      throw new Error('WORKSPACE_PATH_REJECTED');
    for (const item of await readdir(full, { withFileTypes: true })) {
      signal.throwIfAborted();
      if (item.name.startsWith('.')) continue;
      const path = dir + '/' + item.name;
      if (item.isSymbolicLink()) throw new Error('WORKSPACE_FILE_REJECTED');
      if (item.isDirectory()) await walk(path, depth + 1);
      else if (/^[a-zA-Z0-9_./-]+\.(tsx?|css|json|sql)$/.test(path))
        files.push({ path, content: await read(path) });
    }
  }
  for (const dir of ['src', 'server', 'shared', 'db']) {
    try {
      await walk(dir);
    } catch (e) {
      if ((e as { code?: string }).code !== 'ENOENT') throw e;
    }
  }
  for (const name of ['package.json', 'README.md'])
    try {
      files.push({ path: name, content: await read(name) });
    } catch (e) {
      if ((e as { code?: string }).code !== 'ENOENT') throw e;
    }
  const manifest: unknown = JSON.parse(await read('studio.manifest.json'));
  return {
    manifest: manifest as S['SourceManifest'],
    files,
    message: 'Harness workspace source upload',
  };
}
