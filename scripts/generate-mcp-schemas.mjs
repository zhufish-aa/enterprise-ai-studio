import { readFile, writeFile } from 'node:fs/promises';
const spec = JSON.parse(
  await readFile(new URL('../packages/api-contract/openapi.json', import.meta.url), 'utf8'),
);
const names = [
  'QuerySpec',
  'SourceManifest',
  'StudioAppCreate',
  'StudioReportCreate',
  'ReportDefinition',
  'ReadServerWorkspaceFile',
  'WriteServerWorkspace',
  'EditServerWorkspace',
  'RemoveServerWorkspaceFiles',
  'MoveServerWorkspaceFile',
  'CheckoutServerWorkspace',
  'CommitServerWorkspace',
  'StudioDebugOpen',
  'StudioDebugAction',
  'Stage06CreateRelease',
];
function extract(name) {
  const definitions = {};
  function include(key) {
    if (definitions[key]) return;
    const source = spec.components.schemas[key];
    if (!source) throw new Error('MCP_SCHEMA_NOT_FOUND: ' + key);
    definitions[key] = structuredClone(source);
    const refs = [...JSON.stringify(source).matchAll(/"\$ref":"#\/components\/schemas\/([^"]+)"/g)];
    for (const match of refs) include(match[1]);
  }
  include(name);
  const converted = JSON.parse(
    JSON.stringify(definitions).replaceAll('#/components/schemas/', '#/$defs/'),
  );
  return { ...converted[name], $defs: converted };
}
await writeFile(
  new URL('../packages/mcp-server/src/schemas.json', import.meta.url),
  JSON.stringify(Object.fromEntries(names.map((name) => [name, extract(name)])), null, 2) + '\n',
);
