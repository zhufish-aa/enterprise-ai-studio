import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../packages/api-contract/openapi.json', import.meta.url),
  spec = JSON.parse(await readFile(path, 'utf8')),
  s = spec.components.schemas,
  ref = (n) => ({ $ref: '#/components/schemas/' + n });
for (const name of ['SiteSharing', 'SharedSite', 'UpdateSiteSharing'])
  s[name].properties.visibility.enum = ['private', 'organization', 'public'];
s.StudioApp.properties.sharingVisibility.enum = ['private', 'organization', 'public'];
const get = structuredClone(spec.paths['/site-shares/{shareId}'].get);
get.operationId = 'getPublicSharedSite';
get.summary = '免平台登录读取公开站点';
get.security = [];
get.parameters = get.parameters.filter((p) => p.name === 'shareId');
delete get['x-permissions'];
get.description =
  '只返回当前仍标为 public 的固定版本页面产物。不会赋予匿名访问者数据集权限、源码编辑权限或站内账号身份。';
spec.paths['/public/site-shares/{shareId}'] = { get };
const action = structuredClone(
  (
    spec.paths['/apps/{appId}/student-center/actions'] ??
    spec.paths['/student-centers/{appId}/actions']
  ).post,
);
delete spec.paths['/apps/{appId}/student-center/actions'];
action.operationId = 'studentCenterIndependentAction';
action.summary = '站点独立账号与业务操作';
action.security = [];
action.parameters = [
  { in: 'path', name: 'appId', required: true, schema: { type: 'string', format: 'uuid' } },
  { $ref: '#/components/parameters/Idempotency' },
];
delete action['x-permissions'];
delete action['x-human-only'];
action.description =
  '使用学生事务站点自己的 HttpOnly Cookie 会话，与平台账号完全独立。除登录/会话外要求站点账号、当前角色和 CSRF。所有动作受当前站点版本和数据隔离约束。';
spec.paths['/student-centers/{appId}/actions'] = { post: action };
const codes = s.Error.properties.error.properties.code.enum;
for (const code of [
  'STUDENT_FILE_INVALID',
  'STUDENT_IMPORT_COLUMNS',
  'STUDENT_IMPORT_INVALID',
  'STUDENT_FIELD_INVALID',
  'STUDENT_NUMBER_EXISTS',
  'STUDENT_REVISION_CHANGED',
  'STUDENT_RECORD_NOT_FOUND',
  'STUDENT_CENTER_ACCESS_DENIED',
  'STUDENT_CENTER_ADMIN_REQUIRED',
  'STUDENT_TEMPLATE_CHANGED',
  'STUDENT_MEMBER_INVALID',
  'STUDENT_LAST_ADMIN',
  'STUDENT_SERVICE_UNAVAILABLE',
  'TEMPLATE_INVALID',
  'TEMPLATE_EXTERNAL_RESOURCE',
  'TEMPLATE_FIELD_UNKNOWN',
  'TEMPLATE_RENDER_FAILED',
  'CERTIFICATE_FIELDS_REQUIRED',
  'SITE_CAPABILITY_REQUIRED',
  'STUDENT_LOGIN_REQUIRED',
  'STUDENT_INVALID_CREDENTIALS',
  'STUDENT_ACCOUNT_EXISTS',
])
  if (!codes.includes(code)) codes.push(code);
await writeFile(path, JSON.stringify(spec, null, 2) + '\n');
