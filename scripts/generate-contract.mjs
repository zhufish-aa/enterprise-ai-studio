import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import SwaggerParser from '@apidevtools/swagger-parser';
import openapiTS, { astToString } from 'openapi-typescript';
const input = new URL('../packages/api-contract/openapi.json', import.meta.url);
const output = new URL('../packages/api-contract/src/generated.ts', import.meta.url);
const spec = JSON.parse(await readFile(input, 'utf8'));
await SwaggerParser.validate(fileURLToPath(input));
const operations = Object.values(spec.paths).flatMap((path) => Object.values(path));
const ids = operations.map((op) => op.operationId);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate operationId');
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (!op['x-implementation']) throw new Error('Missing implementation marker: ' + path);
    if (method !== 'get' && !op.parameters.some((p) => p.$ref?.endsWith('/Idempotency')))
      throw new Error('Missing idempotency: ' + path);
    if (
      path.includes('/queries') &&
      JSON.stringify(op.requestBody).includes('physicalConnectionId')
    )
      throw new Error('Connection selector exposed');
  }
}
const generated = astToString(await openapiTS(input));
if (process.argv.includes('--check')) {
  if ((await readFile(output, 'utf8')) !== generated)
    throw new Error('Contract types are stale; run pnpm contract:generate');
} else {
  await writeFile(output, generated);
}
console.log(
  `OpenAPI valid: ${ids.length} operations; generated types ${process.argv.includes('--check') ? 'current' : 'written'}.`,
);
function expand(value) {
  if (Array.isArray(value)) return value.map(expand);
  if (value && typeof value === 'object') {
    if (value.$ref) return expand(spec.components.schemas[value.$ref.split('/').at(-1)]);
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== 'format')
        .map(([k, v]) => [k, expand(v)]),
    );
  }
  return value;
}
const reportNames = new Set();
function collect(value) {
  if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') {
    if (value.$ref) {
      const n = value.$ref.split('/').at(-1);
      if (!reportNames.has(n)) {
        reportNames.add(n);
        collect(spec.components.schemas[n]);
      }
    } else Object.values(value).forEach(collect);
  }
}
collect({ $ref: '#/components/schemas/ReportDefinition' });
const derived = {
  '../packages/harness-plugin/src/debug-schemas.json': {
    StudioDebugOpen: expand(spec.components.schemas.StudioDebugOpen),
    StudioDebugAction: expand(spec.components.schemas.StudioDebugAction),
  },
  '../packages/harness-plugin/src/tool-schemas.json': {
    Stage06CreateRelease: expand(spec.components.schemas.Stage06CreateRelease),
    ReadServerWorkspaceFile: expand(spec.components.schemas.ReadServerWorkspaceFile),
    WriteServerWorkspace: expand(spec.components.schemas.WriteServerWorkspace),
    EditServerWorkspace: expand(spec.components.schemas.EditServerWorkspace),
    RemoveServerWorkspaceFiles: expand(spec.components.schemas.RemoveServerWorkspaceFiles),
    MoveServerWorkspaceFile: expand(spec.components.schemas.MoveServerWorkspaceFile),
    CheckoutServerWorkspace: expand(spec.components.schemas.CheckoutServerWorkspace),
    CommitServerWorkspace: expand(spec.components.schemas.CommitServerWorkspace),
    UpdateSiteSharing: expand(spec.components.schemas.UpdateSiteSharing),
    QuerySpec: expand(spec.components.schemas.QuerySpec),
    StudioAppCreate: expand(spec.components.schemas.StudioAppCreate),
    StudioReportCreate: expand(spec.components.schemas.StudioReportCreate),
    ReportDefinition: expand(spec.components.schemas.ReportDefinition),
  },
  '../packages/api-contract/report.schema.json': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $ref: '#/components/schemas/ReportDefinition',
    components: {
      schemas: Object.fromEntries(
        [...reportNames].sort().map((n) => [n, spec.components.schemas[n]]),
      ),
    },
  },
};
for (const [name, value] of Object.entries(derived)) {
  const text = JSON.stringify(value, null, 2) + '\n',
    file = new URL(name, import.meta.url);
  if (process.argv.includes('--check')) {
    if ((await readFile(file, 'utf8')) !== text) throw new Error('Derived schema stale: ' + name);
  } else await writeFile(file, text);
}
