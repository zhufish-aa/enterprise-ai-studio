import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import './generate-harness-skill.mjs';
const require = createRequire(new URL('../packages/harness-plugin/package.json', import.meta.url));
const { build } = await import(pathToFileURL(require.resolve('esbuild')).href);
const { name: pluginName } = JSON.parse(
  await readFile(new URL('../packages/harness-plugin/package.json', import.meta.url), 'utf8'),
);
await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['packages/harness-plugin/src/index.ts'],
  outfile: 'packages/harness-plugin/dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  external: ['@deepseek-ai/*'],
  sourcemap: true,
});
// Official Desktop client-modules protocol: one lazy CJS factory, with host React.
await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['packages/harness-plugin/src/client/index.tsx'],
  outfile: 'packages/harness-plugin/dist/client.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'chrome130',
  external: ['react', 'react-dom', '@deepseek-ai/*'],
  banner: {
    js:
      'window.__ModuleLoader__.load({id:' +
      JSON.stringify(pluginName) +
      ',factory(require){const module={exports:{}};const exports=module.exports;',
  },
  footer: { js: 'return module.exports;}});' },
  sourcemap: true,
});
