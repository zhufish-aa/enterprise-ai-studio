import { readFile, writeFile } from 'node:fs/promises';
// Pack self-contained subsets from the canonical OpenAPI. Never hand-edit generated schemas.
const source = JSON.parse(
  await readFile(new URL('../packages/api-contract/openapi.json', import.meta.url), 'utf8'),
);
for (const [name, file] of [
  ['QuerySpec', 'query-spec.schema.json'],
  ['SourceManifest', 'source-manifest.schema.json'],
]) {
  const schemas = {};
  function include(key) {
    if (schemas[key]) return;
    const schema = source.components.schemas[key];
    if (!schema) throw new Error('SKILL_SCHEMA_REFERENCE_MISSING');
    schemas[key] = schema;
    for (const match of JSON.stringify(schema).matchAll(
      /"\$ref":"#\/components\/schemas\/([^"]+)"/g,
    ))
      include(match[1]);
  }
  include(name);
  await writeFile(
    new URL(
      '../packages/harness-plugin/skills/enterprise-sites/references/' + file,
      import.meta.url,
    ),
    JSON.stringify(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $ref: '#/components/schemas/' + name,
        components: { schemas },
      },
      null,
      2,
    ) + '\n',
  );
}
