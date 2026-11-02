import { build, type Plugin } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { posix } from 'node:path';
import type { components } from '@eas/api-contract';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import type { SiteBuildArtifact } from '@eas/api-contract';
const allowed = [
  'react',
  'react/jsx-runtime',
  'react-dom/client',
  'echarts',
  'docx-preview',
  '@tiptap/core',
  '@tiptap/react',
  '@tiptap/pm',
  '@tiptap/starter-kit',
  '@tiptap/extension-text-style',
  '@tiptap/extension-text-align',
  '@tiptap/extension-table',
  '@tiptap/extension-image',
  '@eas/platform-sdk/runtime',
  '@eas/report-ui',
  '@eas/report-ui/style.css',
];
/** Parse/bundle only. Never imports uploaded modules into Node or runs package scripts/config. */
export async function compile(
  files: components['schemas']['SourceUpload']['files'],
  diagnostic?: (error: unknown) => void,
): Promise<{ ok: true; gzip: string } | { ok: false; code: string; diagnostics?: string[] }> {
  const map = new Map<string, string>();
  let bytes = 0;
  for (const f of files) {
    if (
      !/^(src\/[a-zA-Z0-9_./-]+\.(tsx?|css)|shared\/[a-zA-Z0-9_./-]+\.(ts|json)|package\.json|README\.md)$/.test(
        f.path,
      ) ||
      f.path.split('/').some((p) => p === '..' || p === '.' || p.startsWith('.')) ||
      map.has(f.path.toLowerCase())
    )
      return { ok: false, code: 'SOURCE_PATH_REJECTED' };
    bytes += Buffer.byteLength(f.content);
    map.set(f.path, f.content);
  }
  if (bytes > 4 * 1024 * 1024 || files.length > 1000 || !map.has('src/main.tsx'))
    return { ok: false, code: 'SOURCE_PATH_REJECTED' };
  let rejected = false;
  const virtual: Plugin = {
    name: 'sealed-source',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') return { path: 'src/main.tsx', namespace: 'source' };
        if (args.namespace !== 'source') return undefined;
        if (allowed.includes(args.path))
          return { path: fileURLToPath(import.meta.resolve(args.path)) };
        if (!args.path.startsWith('.') || args.path.includes('\\')) {
          rejected = true;
          return { errors: [{ text: 'SOURCE_IMPORT_REJECTED' }] };
        }
        const base = posix.normalize(posix.join(posix.dirname(args.importer), args.path));
        const found = [
          base,
          base + '.tsx',
          base + '.ts',
          base + '/index.tsx',
          base + '/index.ts',
        ].find((k) => map.has(k));
        if (!found || !['src/', 'shared/'].some((prefix) => found.startsWith(prefix))) {
          rejected = true;
          return { errors: [{ text: 'SOURCE_IMPORT_REJECTED' }] };
        }
        return { path: found, namespace: 'source' };
      });
      b.onLoad({ filter: /.*/, namespace: 'source' }, (args) => ({
        contents: map.get(args.path)!,
        loader: args.path.endsWith('.css') ? 'css' : args.path.endsWith('.tsx') ? 'tsx' : 'ts',
      }));
    },
  };
  try {
    const output = await build({
      entryPoints: ['src/main.tsx'],
      bundle: true,
      write: false,
      outdir: 'out',
      format: 'iife',
      platform: 'browser',
      target: ['es2022'],
      jsx: 'automatic',
      minify: true,
      logLevel: 'silent',
      plugins: [virtual],
      define: { 'process.env.NODE_ENV': '"production"' },
      legalComments: 'none',
      sourcemap: false,
    });
    const js = output.outputFiles.find((f) => f.path.endsWith('.js'))?.text,
      css = output.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
    if (!js) return { ok: false, code: 'SOURCE_SYNTAX_INVALID' };
    // The nonce is a compiler-owned constant; the isolated origin has no cookies, network, forms or navigation rights.
    const html =
      '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'nonce-studio-static-v1\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'"><style>' +
      css.replaceAll('</style', '<\\/style') +
      '</style><div id="root"></div><script nonce="studio-static-v1">' +
      js.replaceAll('</script', '<\\/script') +
      '</script></html>';
    if (Buffer.byteLength(html) > 8388608) return { ok: false, code: 'BUILD_OUTPUT_TOO_LARGE' };
    const gzip = gzipSync(html).toString('base64');
    if (gzip.length > 1800000) return { ok: false, code: 'BUILD_OUTPUT_TOO_LARGE' };
    return { ok: true, gzip };
  } catch (error) {
    diagnostic?.(error);
    const errors =
      (
        error as {
          errors?: {
            text: string;
            location?: { file: string; line: number; column: number };
            notes?: { text: string }[];
          }[];
        }
      ).errors ?? [];
    const diagnostics = errors.map((item) => {
      const location = item.location,
        file = location?.file.replace(/^source:/, '');
      return (
        (location && file ? file + ':' + location.line + ':' + (location.column + 1) + ' · ' : '') +
        item.text +
        (item.notes?.length ? '\n' + item.notes.map((note) => note.text).join('\n') : '')
      );
    });
    return {
      ok: false,
      code: rejected ? 'SOURCE_IMPORT_REJECTED' : 'SOURCE_SYNTAX_INVALID',
      ...(diagnostics.length ? { diagnostics } : {}),
    };
  }
}

export async function compileFullstack(
  files: components['schemas']['SourceUpload']['files'],
  runtime: { entrypoint: string; dataSource: string },
) {
  const sha = (text: string) => createHash('sha256').update(text).digest('hex');
  const frontend = await compile(
    files.filter(
      (f) =>
        f.path.startsWith('src/') ||
        f.path.startsWith('shared/') ||
        ['package.json', 'README.md'].includes(f.path),
    ),
  );
  if (!frontend.ok) return frontend;
  const map = new Map(files.map((f) => [f.path, f.content]));
  if (!/^server\/[a-zA-Z0-9_/-]+\.ts$/.test(runtime.entrypoint) || !map.has(runtime.entrypoint))
    return { ok: false as const, code: 'SITE_BACKEND_ENTRY_REQUIRED' };
  const dependencies = new Set([
    'fastify',
    'pg',
    'ajv',
    'docx',
    'docxtemplater',
    'exceljs',
    'pizzip',
    '@xmldom/xmldom',
  ]);
  const virtual: Plugin = {
    name: 'site-backend-source',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (args.kind === 'entry-point') return { path: runtime.entrypoint, namespace: 'backend' };
        if (args.path.startsWith('node:') || dependencies.has(args.path))
          return { path: args.path, external: true };
        if (!args.path.startsWith('.'))
          return { errors: [{ text: 'Unsupported backend dependency: ' + args.path }] };
        const base = posix.normalize(posix.join(posix.dirname(args.importer), args.path)),
          candidates = [
            base,
            base.replace(/\.js$/, '.ts'),
            base + '.ts',
            base + '.json',
            base + '/index.ts',
          ];
        const path = candidates.find((k) => map.has(k));
        if (!path || !['server/', 'shared/'].some((p) => path.startsWith(p)))
          return { errors: [{ text: 'Backend import outside its project: ' + args.path }] };
        return { path, namespace: 'backend' };
      });
      b.onLoad({ filter: /.*/, namespace: 'backend' }, (args) => ({
        contents: map.get(args.path)!,
        loader: args.path.endsWith('.json') ? 'json' : 'ts',
      }));
    },
  };
  try {
    const output = await build({
        entryPoints: [runtime.entrypoint],
        bundle: true,
        write: false,
        format: 'cjs',
        platform: 'node',
        target: ['node24'],
        logLevel: 'silent',
        plugins: [virtual],
        sourcemap: 'inline',
      }),
      backend = output.outputFiles[0]!.text;
    const { gunzipSync } = await import('node:zlib');
    const artifact: SiteBuildArtifact = {
      format: 'site-fullstack-v1',
      html: gunzipSync(Buffer.from(frontend.gzip, 'base64')).toString(),
      backend,
      backendDigest: sha(backend),
      dataSource: runtime.dataSource,
      migrations: files
        .filter((f) => f.path.startsWith('db/') && f.path.endsWith('.sql'))
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((f) => ({ ...f, digest: sha(f.content) })),
    };
    return { ok: true as const, gzip: gzipSync(JSON.stringify(artifact)).toString('base64') };
  } catch (error) {
    const diagnostics = ((error as { errors?: { text: string }[] }).errors ?? []).map(
      (e) => e.text,
    );
    return { ok: false as const, code: 'SITE_BACKEND_BUILD_FAILED', diagnostics };
  }
}
