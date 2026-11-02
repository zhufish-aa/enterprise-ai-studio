import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../packages/api-contract/openapi.json', import.meta.url),
  spec = JSON.parse(await readFile(path, 'utf8')),
  s = spec.components.schemas;
const ref = (n) => ({ $ref: '#/components/schemas/' + n }),
  str = { type: 'string' },
  uuid = { type: 'string', format: 'uuid' },
  integer = { type: 'integer', minimum: 0 },
  obj = (properties, required = Object.keys(properties)) => ({
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  }),
  arr = (items) => ({ type: 'array', items });
const fieldNames = {
  studentNumber: '学号',
  name: '姓名',
  gender: '性别',
  birthDate: '出生日期',
  idNumber: '证件号码',
  className: '班级',
  admissionDate: '入学时间',
  graduationDate: '毕业时间',
  withdrawalDate: '肄业时间',
  expectedGraduationDate: '预计毕业时间',
  grade: '就读年级',
  academicYear: '目前就读学年',
  holidayStart: '放假开始时间',
  holidayEnd: '放假结束时间',
  schoolName: '学校名称',
  ethnicity: '民族',
  department: '院系',
  major: '专业',
  status: '学籍状态',
};
s.StudentProfile = obj(
  Object.fromEntries(
    Object.entries(fieldNames).map(([k, description]) => [
      k,
      { type: 'string', maxLength: 500, description },
    ]),
  ),
  ['studentNumber', 'name'],
);
s.StudentRecord = obj({
  id: uuid,
  revision: integer,
  profile: ref('StudentProfile'),
  createdAt: str,
  updatedAt: str,
});
s.StudentTemplateKind = { type: 'string', pattern: '^[a-z][a-z0-9_-]*$' };
s.StudentTemplate = obj({
  id: uuid,
  kind: ref('StudentTemplateKind'),
  name: str,
  format: { type: 'string', enum: ['text', 'docx'] },
  body: str,
  requiredFields: arr(str),
  version: integer,
  originalFileName: str,
  createdAt: str,
});
s.StudentCertificateSummary = obj({
  id: uuid,
  number: str,
  studentId: uuid,
  studentNumber: str,
  studentName: str,
  templateName: str,
  issueDate: str,
  createdAt: str,
  createdBy: str,
});
s.StudentCertificate = obj({
  summary: ref('StudentCertificateSummary'),
  template: ref('StudentTemplate'),
  fields: { type: 'object', additionalProperties: str },
  contentBase64: { type: ['string', 'null'] },
  fileName: str,
});
s.StudentCertificatePreview = obj({
  template: ref('StudentTemplate'),
  fields: { type: 'object', additionalProperties: str },
  contentBase64: { type: ['string', 'null'] },
  fileName: str,
});
s.StudentCenterSettings = obj({
  schoolName: str,
  departmentName: str,
  signature: str,
  academicYear: str,
  holidayStart: str,
  holidayEnd: str,
  revision: integer,
});
s.StudentCenterMember = obj({
  userId: uuid,
  name: str,
  username: str,
  role: { type: 'string', enum: ['administrator', 'staff'] },
});
s.StudentCenterSession = obj({
  user: { oneOf: [ref('StudentCenterMember'), { type: 'null' }] },
  departmentName: str,
});
s.StudentCenterLogin = obj({
  username: { type: 'string', minLength: 1, maxLength: 64 },
  password: { type: 'string', minLength: 1, maxLength: 128 },
});
s.StudentCenterPassword = obj({
  currentPassword: str,
  password: { type: 'string', minLength: 1, maxLength: 128 },
});
s.StudentCenterBootstrap = obj({
  settings: ref('StudentCenterSettings'),
  currentUser: ref('StudentCenterMember'),
  counts: obj({ students: integer, certificates: integer, todayCertificates: integer }),
  templates: arr(ref('StudentTemplate')),
  recent: arr(ref('StudentCertificateSummary')),
});
s.StudentSearch = obj(
  {
    keyword: str,
    studentNumber: str,
    name: str,
    className: str,
    status: str,
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1 },
  },
  [],
);
s.StudentSearchResult = obj({
  items: arr(ref('StudentRecord')),
  total: integer,
  page: integer,
  pageSize: integer,
  classes: arr(str),
});
s.StudentSave = obj({ id: uuid, revision: integer, profile: ref('StudentProfile') }, ['profile']);
s.StudentArchive = obj({ id: uuid, revision: integer });
s.StudentImport = obj(
  {
    fileName: str,
    contentBase64: str,
    mode: { type: 'string', enum: ['preview', 'commit'] },
    updateExisting: { type: 'boolean' },
  },
  ['fileName', 'contentBase64', 'mode'],
);
s.StudentImportResult = obj({
  total: integer,
  valid: integer,
  created: integer,
  updated: integer,
  skipped: integer,
  columns: arr(str),
  sample: arr(ref('StudentProfile')),
  issues: arr(obj({ row: integer, message: str })),
  committed: { type: 'boolean' },
});
s.StudentTemplateSave = obj(
  { kind: ref('StudentTemplateKind'), name: str, body: str, expectedId: uuid },
  ['kind', 'name', 'body'],
);
s.StudentTemplateDelete = obj({ id: uuid });
s.StudentTemplateDeleteResult = obj({ deleted: { type: 'boolean', const: true } });
s.StudentTemplateUpload = obj(
  {
    kind: ref('StudentTemplateKind'),
    name: str,
    fileName: str,
    contentBase64: str,
    expectedId: uuid,
  },
  ['kind', 'name', 'fileName', 'contentBase64'],
);
s.StudentCertificateCreate = obj(
  {
    studentId: uuid,
    templateId: uuid,
    issueDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    fields: { type: 'object', additionalProperties: { type: 'string', maxLength: 1000 } },
  },
  ['studentId', 'templateId', 'issueDate', 'fields'],
);
s.StudentCertificateSearch = obj(
  {
    keyword: str,
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1 },
  },
  [],
);
s.StudentCertificateSearchResult = obj({
  items: arr(ref('StudentCertificateSummary')),
  total: integer,
  page: integer,
  pageSize: integer,
});
s.StudentCenterSettingsSave = obj({
  schoolName: str,
  departmentName: str,
  signature: str,
  academicYear: str,
  holidayStart: str,
  holidayEnd: str,
  revision: integer,
});
s.StudentCenterMemberSave = obj(
  {
    userId: uuid,
    username: { type: 'string', minLength: 1, maxLength: 64 },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    password: { type: 'string', minLength: 1, maxLength: 128 },
    role: { type: 'string', enum: ['administrator', 'staff', 'remove'] },
  },
  ['role'],
);
s.StudentCenterMembers = obj({ items: arr(ref('StudentCenterMember')) });
const empty = obj({}),
  actions = {
    'templates.delete': [ref('StudentTemplateDelete'), ref('StudentTemplateDeleteResult')],
    bootstrap: [empty, ref('StudentCenterBootstrap')],
    'students.search': [ref('StudentSearch'), ref('StudentSearchResult')],
    'students.save': [ref('StudentSave'), ref('StudentRecord')],
    'students.archive': [ref('StudentArchive'), obj({ archived: { type: 'boolean' } })],
    'students.import': [ref('StudentImport'), ref('StudentImportResult')],
    'templates.save': [ref('StudentTemplateSave'), ref('StudentTemplate')],
    'templates.upload': [ref('StudentTemplateUpload'), ref('StudentTemplate')],
    'templates.file': [obj({ id: uuid }), obj({ contentBase64: str, fileName: str })],
    'certificates.create': [ref('StudentCertificateCreate'), ref('StudentCertificate')],
    'certificates.search': [ref('StudentCertificateSearch'), ref('StudentCertificateSearchResult')],
    'certificates.get': [obj({ id: uuid }), ref('StudentCertificate')],
    'settings.save': [ref('StudentCenterSettingsSave'), ref('StudentCenterSettings')],
    'members.list': [empty, ref('StudentCenterMembers')],
    'members.save': [ref('StudentCenterMemberSave'), ref('StudentCenterMembers')],
  };
actions['auth.session'] = [empty, ref('StudentCenterSession')];
actions['auth.login'] = [ref('StudentCenterLogin'), ref('StudentCenterSession')];
actions['auth.logout'] = [empty, ref('StudentCenterSession')];
actions['auth.password'] = [ref('StudentCenterPassword'), obj({ changed: { type: 'boolean' } })];
actions['certificates.preview'] = [
  ref('StudentCertificateCreate'),
  ref('StudentCertificatePreview'),
];
s.StudentCenterRequest = {
  oneOf: Object.entries(actions).map(([action, [payload]]) =>
    obj({ action: { type: 'string', const: action }, payload, versionId: uuid }),
  ),
};
s.StudentCenterResponse = {
  oneOf: Object.entries(actions).map(([action, [, result]]) =>
    obj({ action: { type: 'string', const: action }, result }),
  ),
};
s.StudentCenterEnable = obj(
  {
    schoolName: { type: 'string', maxLength: 200 },
    departmentName: { type: 'string', maxLength: 200 },
    adminUsername: { type: 'string', minLength: 1, maxLength: 64 },
    adminPassword: { type: 'string', minLength: 1, maxLength: 128 },
  },
  ['departmentName', 'adminUsername', 'adminPassword'],
);
s.SourceManifest.properties.capabilities = {
  type: 'array',
  uniqueItems: true,
  items: { type: 'string', enum: ['student-center'] },
  description:
    'Explicit platform-managed business capabilities required by this immutable version.',
};
const template = structuredClone(spec.paths['/apps/{appId}/workspace/write'].post);
for (const [suffix, name, request, response, permission] of [
  ['/actions', 'studentCenterAction', 'StudentCenterRequest', 'StudentCenterResponse', 'app.view'],
  ['/enable', 'enableStudentCenter', 'StudentCenterEnable', 'StudentCenterSettings', 'app.develop'],
]) {
  const op = structuredClone(template);
  op.operationId = name;
  op.summary =
    suffix === '/enable'
      ? '为私有站点初始化学生事务工作台'
      : '当前访问者操作站点托管的学生、模板与证明';
  op.tags = ['Student center'];
  op['x-permissions'] = [permission];
  op['x-human-only'] = true;
  op['x-implementation'] = 'student-center';
  op.description =
    '身份来自当前登录会话，组织、站点成员、工作台角色及不可变版本能力在服务端实时校验。学生和模板存入平台托管记录，不使用或切换企业生产数据源。操作遵守 Idempotency-Key；读请求同样不缓存。';
  op.requestBody = { required: true, content: { 'application/json': { schema: ref(request) } } };
  op.responses = {
    200: { description: '成功', content: { 'application/json': { schema: ref(response) } } },
    ...Object.fromEntries(
      ['400', '401', '403', '404', '409', '422', '503'].map((status) => [
        status,
        {
          description: '字段说明、业务原因和请求追踪信息',
          content: { 'application/json': { schema: ref('Error') } },
        },
      ]),
    ),
  };
  spec.paths['/apps/{appId}/student-center' + suffix] = { post: op };
}
await writeFile(path, JSON.stringify(spec, null, 2) + '\n');

await import('./student-rich-document-contract.mjs');
