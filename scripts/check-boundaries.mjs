import { readdir, readFile } from 'node:fs/promises';
const roots = ['apps', 'packages', 'services'];
const manifests = [];
for (const root of roots)
  for (const entry of await readdir(root)) {
    manifests.push({
      dir: `${root}/${entry}`,
      ...JSON.parse(await readFile(`${root}/${entry}/package.json`, 'utf8')),
    });
  }
const allowed = {
  '@eas/shared': [],
  '@eas/api-contract': [],
  '@eas/platform-sdk': ['@eas/api-contract'],
  '@eas/report-ui': ['@eas/api-contract', '@eas/platform-sdk'],
  '@eas/platform-api': [
    '@eas/shared',
    '@eas/api-contract',
    '@eas/connector-transport',
    '@eas/mcp-server',
  ],
  '@eas/platform-web': ['@eas/shared', '@eas/api-contract', '@eas/report-ui', '@eas/platform-sdk'],
  '@eas/report-runtime': [
    '@eas/shared',
    '@eas/api-contract',
    '@eas/report-ui',
    '@eas/platform-sdk',
  ],
  '@zhujunjie12/harness-plugin': ['@eas/shared', '@eas/api-contract', '@eas/platform-sdk'],
  '@eas/mcp-server': ['@eas/api-contract', '@eas/platform-sdk'],
  '@eas/query-worker': [
    '@eas/shared',
    '@eas/api-contract',
    '@eas/database-adapters',
    '@eas/connector-transport',
  ],
  '@eas/database-adapters': ['@eas/api-contract'],
  '@eas/connector-transport': [],
  '@eas/deployment-worker': ['@eas/api-contract', '@eas/connector-transport'],
  '@eas/preview-worker': ['@eas/api-contract', '@eas/connector-transport'],
  '@eas/build-worker': [
    '@eas/shared',
    '@eas/api-contract',
    '@eas/connector-transport',
    '@eas/platform-sdk',
    '@eas/report-ui',
  ],
  '@eas/site-worker': ['@eas/api-contract', '@eas/connector-transport'],
};
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = dir + '/' + item.name;
    if (item.isDirectory()) {
      if (!['dist', 'node_modules'].includes(item.name)) await scan(path);
    } else if (/\.[cm]?[jt]sx?$/.test(item.name)) {
      const content = await readFile(path, 'utf8');
      if (/(?:from\s*|import\s*\()\s*['"]\.\.\/\.\.\/\.\.\//.test(content))
        throw new Error('Cross-package relative import: ' + path);
    }
  }
}
for (const pkg of manifests) {
  for (const dependency of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (dependency.startsWith('@eas/') && !allowed[pkg.name]?.includes(dependency))
      throw new Error(`${pkg.name} -> ${dependency} is forbidden`);
  }
  await scan(pkg.dir + '/src');
}
console.log('Workspace dependency boundaries valid: ' + manifests.length + ' packages.');
