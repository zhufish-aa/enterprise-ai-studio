import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../packages/api-contract/openapi.json', import.meta.url),
  spec = JSON.parse(await readFile(path, 'utf8')),
  s = spec.components.schemas,
  ref = (n) => ({ $ref: '#/components/schemas/' + n });
const object = (properties, required = []) => ({
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  }),
  string = { type: 'string' },
  number = { type: 'number' };
const attrs = {
  textAlign: { type: 'string', enum: ['left', 'center', 'right', 'justify'] },
  lineHeight: { type: 'string', pattern: '^[0-9]+(?:\\.[0-9]+)?$' },
  firstLineIndent: { type: 'number', minimum: 0 },
  spaceBefore: { type: 'number', minimum: 0 },
  spaceAfter: { type: 'number', minimum: 0 },
  level: { type: 'integer', enum: [1, 2, 3] },
  start: { type: 'integer', minimum: 1 },
  fieldKey: string,
  src: { type: 'string', pattern: '^data:image/(?:png|jpeg|gif|bmp);base64,[A-Za-z0-9+/]+={0,2}$' },
  width: { type: 'number', exclusiveMinimum: 0 },
  height: { type: 'number', exclusiveMinimum: 0 },
  alt: string,
  title: string,
  colspan: { type: 'integer', minimum: 1 },
  rowspan: { type: 'integer', minimum: 1 },
  colwidth: { type: 'array', items: { type: 'integer', minimum: 1 } },
};
const markAttrs = {
  fontFamily: {
    type: 'string',
    enum: ['SimSun', 'SimHei', 'Microsoft YaHei', 'FangSong', 'KaiTi', 'Arial'],
  },
  fontSize: { type: 'string', pattern: '^[0-9]+(?:\\.[0-9]+)?pt$' },
  color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
};
s.StudentRichMark = object(
  {
    type: { type: 'string', enum: ['bold', 'italic', 'underline', 'strike', 'textStyle'] },
    attrs: object(markAttrs),
  },
  ['type'],
);
s.StudentRichNode = object(
  {
    type: {
      type: 'string',
      enum: [
        'paragraph',
        'heading',
        'text',
        'hardBreak',
        'horizontalRule',
        'bulletList',
        'orderedList',
        'listItem',
        'templateField',
        'table',
        'tableRow',
        'tableCell',
        'tableHeader',
        'image',
      ],
    },
    text: string,
    attrs: object(attrs),
    marks: { type: 'array', items: ref('StudentRichMark') },
    content: { type: 'array', items: ref('StudentRichNode') },
  },
  ['type'],
);
s.StudentRichDocument = object(
  {
    schemaVersion: { type: 'string', const: '1.0' },
    type: { type: 'string', const: 'doc' },
    content: { type: 'array', items: ref('StudentRichNode') },
  },
  ['schemaVersion', 'type', 'content'],
);
s.StudentTemplate.properties.document = { oneOf: [ref('StudentRichDocument'), { type: 'null' }] };
s.StudentTemplateSave.properties.document = ref('StudentRichDocument');
s.StudentTemplateImport = object({ fileName: string, contentBase64: string }, [
  'fileName',
  'contentBase64',
]);
s.StudentTemplateImportResult = object(
  {
    document: ref('StudentRichDocument'),
    body: string,
    suggestedName: string,
    notes: { type: 'array', items: string },
  },
  ['document', 'body', 'suggestedName', 'notes'],
);
s.StudentTemplateExport = object({ name: string, document: ref('StudentRichDocument') }, [
  'name',
  'document',
]);
for (const [action, payload, result] of [
  ['templates.import', 'StudentTemplateImport', 'StudentTemplateImportResult'],
  ['templates.export', 'StudentTemplateExport', null],
]) {
  const request = object(
    {
      action: { type: 'string', const: action },
      versionId: { type: 'string', format: 'uuid' },
      payload: ref(payload),
    },
    ['action', 'versionId', 'payload'],
  );
  const response = object(
    {
      action: { type: 'string', const: action },
      result: result
        ? ref(result)
        : object({ fileName: string, contentBase64: string }, ['fileName', 'contentBase64']),
    },
    ['action', 'result'],
  );
  s.StudentCenterRequest.oneOf = s.StudentCenterRequest.oneOf
    .filter((x) => x.properties.action.const !== action)
    .concat(request);
  s.StudentCenterResponse.oneOf = s.StudentCenterResponse.oneOf
    .filter((x) => x.properties.action.const !== action)
    .concat(response);
}
await writeFile(path, JSON.stringify(spec, null, 2) + '\n');
