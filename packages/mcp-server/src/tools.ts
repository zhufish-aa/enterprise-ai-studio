import type { CallToolResult, JSONObject, Tool } from '@modelcontextprotocol/server';
import type { components } from '@eas/api-contract';
import { PlatformError } from '@eas/platform-sdk';
import type { McpPlatformPort } from './port.js';
import schemas from './schemas.json' with { type: 'json' };
import { developmentGuide } from './guide.js';

type S = components['schemas'];
export type Schema = Record<string, unknown>;
export interface EnterpriseTool {
  definition: Tool;
  run: (
    args: Record<string, unknown>,
    port: McpPlatformPort,
    signal: AbortSignal,
  ) => Promise<unknown>;
  image?: boolean;
}
const uuid: Schema = {
    type: 'string',
    format: 'uuid',
    pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
  },
  text: Schema = { type: 'string' };
function object(
  properties: Record<string, Schema>,
  required = Object.keys(properties),
): Tool['inputSchema'] {
  const definitions: Record<string, unknown> = {},
    fields: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(properties)) {
    const { $defs, ...field } = schema;
    Object.assign(definitions, $defs ?? {});
    fields[key] = field;
  }
  return {
    type: 'object',
    additionalProperties: false,
    properties: fields,
    required,
    ...(Object.keys(definitions).length ? { $defs: definitions } : {}),
  } as Tool['inputSchema'];
}
const all: EnterpriseTool[] = [];
function tool(
  name: string,
  description: string,
  schema: Schema,
  run: EnterpriseTool['run'],
  readOnly = true,
  destructive = false,
  image = false,
) {
  all.push({
    definition: {
      name,
      description,
      inputSchema: schema as Tool['inputSchema'],
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: destructive,
        idempotentHint: readOnly,
        openWorldHint: false,
      },
    },
    run,
    ...(image ? { image: true } : {}),
  });
}
const id = (a: Record<string, unknown>, key: string) => a[key] as string;
const href = (p: McpPlatformPort, appId?: string, versionId?: string) =>
  new URL(
    '/?section=apps' + (appId ? '&app=' + appId : '') + (versionId ? '&version=' + versionId : ''),
    p.portalUrl,
  ).href;
const post = (p: McpPlatformPort, path: string, body: unknown, signal: AbortSignal) =>
  p.request(path, { method: 'POST', body, signal });
async function catalogItems<T>(
  p: McpPlatformPort,
  path: string,
  signal: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const page: { items: T[]; nextCursor: string | null } = await p.request(
      path + '?pageSize=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
      { signal },
    );
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

tool(
  'enterprise_get_development_guide',
  '读取企业站点、报表开发、构建及远程调试的完整工具流程。',
  object({}),
  async () => ({ guide: developmentGuide }),
);
tool(
  'enterprise_connection_status',
  '读取当前连接用户、平台能力和门户地址。',
  object({}),
  async (_a, p, s) => ({
    user: await p.request('/me', { signal: s }),
    capabilities: await p.request('/studio/capabilities', { signal: s }),
    portalUrl: p.portalUrl,
  }),
);
tool('enterprise_portal', '获取当前公司企业平台的 Web 门户。', object({}), async (_a, p) => ({
  portalUrl: p.portalUrl,
}));
tool(
  'enterprise_datasource_list',
  '列出当前用户可用的逻辑数据源、业务系统和授权数据集；仅 TEST 能力。',
  object({}),
  async (_a, p, s) => {
    const [sources, datasets] = await Promise.all([
      catalogItems<S['LogicalDataSource']>(p, '/logical-data-sources', s),
      catalogItems<S['Dataset']>(p, '/datasets', s),
    ]);
    return {
      items: sources.map((source) => ({
        id: source.id,
        name: source.name,
        systemCode: source.systemCode,
        description: source.description,
        availableEnvironments: ['test'],
        datasets: datasets
          .filter((d) => d.logicalDataSourceId === source.id)
          .map((d) => ({ id: d.id, name: d.name, description: d.description })),
      })),
    };
  },
);
tool(
  'enterprise_dataset_list',
  '列出授权业务数据集，可用 datasourceId 筛选。',
  object({ datasourceId: uuid }, []),
  async (a, p, s) => {
    const items = await catalogItems<S['Dataset']>(p, '/datasets', s);
    return {
      items: items.filter((d) => !a['datasourceId'] || d.logicalDataSourceId === a['datasourceId']),
    };
  },
);
tool(
  'enterprise_dataset_schema',
  '读取数据集的授权字段、类型、可用维度、指标口径与关联关系。',
  object({ datasetId: uuid }),
  async (a, p, s) => p.request('/datasets/' + id(a, 'datasetId') + '/versions', { signal: s }),
);
tool(
  'enterprise_dataset_preview',
  '通过平台查询网关执行结构化 TEST 查询，返回查询任务；不接受 SQL、主机或生产环境。',
  object({ query: schemas.QuerySpec }),
  async (a, p, s) => post(p, '/queries/test', { query: a['query'] }, s),
);
tool(
  'enterprise_query_status',
  '读取当前用户查询任务的真实结果、状态和错误。',
  object({ queryJobId: uuid }),
  async (a, p, s) => p.request('/query-jobs/' + id(a, 'queryJobId'), { signal: s }),
);
tool(
  'enterprise_query_cancel',
  '取消当前用户的查询任务。',
  object({ queryJobId: uuid }),
  async (a, p, s) => post(p, '/query-jobs/' + id(a, 'queryJobId') + '/cancel', undefined, s),
  false,
);
tool(
  'enterprise_app_list',
  '列出我创建或有权访问的 SITE/REPORT 应用。',
  object({}),
  async (_a, p, s) => p.request('/apps', { signal: s }),
);
tool(
  'enterprise_app_create',
  '创建业务网站或报表项目；由当前 AI 客户端通过服务器工作区工具编写代码。',
  schemas.StudioAppCreate,
  async (a, p, s) => post(p, '/apps', a, s),
  false,
);
tool(
  'enterprise_app_get',
  '读取应用详情、版本和 Web 管理入口。',
  object({ appId: uuid }),
  async (a, p, s) => ({
    app: await p.request('/apps/' + id(a, 'appId'), { signal: s }),
    versions: await p.request('/apps/' + id(a, 'appId') + '/versions', { signal: s }),
    portalUrl: href(p, id(a, 'appId')),
  }),
);
tool(
  'enterprise_app_versions',
  '读取应用的不可变源码版本和文件变更记录。',
  object({ appId: uuid }),
  async (a, p, s) => p.request('/apps/' + id(a, 'appId') + '/versions', { signal: s }),
);
tool(
  'enterprise_workspace_list',
  '列出服务器项目草稿文件、内容摘要、baseVersionId 和 revision。',
  object({ appId: uuid }),
  async (a, p, s) => p.request('/apps/' + id(a, 'appId') + '/workspace', { signal: s }),
);
for (const [suffix, schema, description, destructive] of [
  ['read', schemas.ReadServerWorkspaceFile, '读取服务器项目文件全文。', false],
  [
    'write',
    schemas.WriteServerWorkspace,
    '创建或保存服务器文件，可批量写入；携带刚读取的 revision。',
    true,
  ],
  [
    'edit',
    schemas.EditServerWorkspace,
    '精确替换服务器文件中的文本；revision 冲突后读取并合并。',
    true,
  ],
  ['remove', schemas.RemoveServerWorkspaceFiles, '删除服务器草稿文件，历史版本保持不变。', true],
  ['move', schemas.MoveServerWorkspaceFile, '重命名或移动服务器草稿文件。', true],
  [
    'checkout',
    schemas.CheckoutServerWorkspace,
    '将指定历史版本载入服务器草稿，不修改已提交版本。',
    true,
  ],
  ['commit', schemas.CommitServerWorkspace, '提交服务器草稿并创建不可变源码版本。', false],
] as const) {
  const extended = object({ appId: uuid, ...(schema.properties as Record<string, Schema>) }, [
    'appId',
    ...schema.required,
  ]);
  if ('$defs' in schema) extended['$defs'] = schema.$defs;
  tool(
    'enterprise_workspace_' + suffix,
    description,
    extended,
    async (a, p, s) => {
      const { appId, ...body } = a;
      return post(p, '/apps/' + String(appId) + '/workspace/' + suffix, body, s);
    },
    suffix === 'read',
    destructive,
  );
}
tool(
  'enterprise_site_data_sources',
  '读取此站点独立数据源，不返回口令。',
  object({ appId: uuid }),
  async (a, p, s) => p.request('/apps/' + id(a, 'appId') + '/site-data-sources', { signal: s }),
);
tool(
  'enterprise_site_database_create',
  '创建站点专用托管数据库；外部数据库口令在网页数据源表单填写。',
  object({ appId: uuid, key: text, name: text, revision: { type: 'integer', minimum: 0 } }, [
    'appId',
    'key',
    'name',
  ]),
  async (a, p, s) =>
    post(
      p,
      '/apps/' + id(a, 'appId') + '/site-data-sources',
      { key: a['key'], name: a['name'], mode: 'managed', revision: a['revision'] ?? 0 },
      s,
    ),
  false,
);
tool(
  'enterprise_site_schema',
  '检查站点连接并读取真实业务表结构。',
  object({ appId: uuid, key: text }),
  async (a, p, s) =>
    post(p, '/apps/' + id(a, 'appId') + '/site-data-sources/inspect', { key: a['key'] }, s),
);
tool(
  'enterprise_site_backend_deploy',
  '部署已构建的站点后端，在站点自己的数据库执行迁移并检查健康状态。',
  object({ appId: uuid, versionId: uuid }),
  async (a, p, s) =>
    post(p, '/apps/' + id(a, 'appId') + '/site-runtime/deploy', { versionId: a['versionId'] }, s),
  false,
);
tool(
  'enterprise_site_backend_status',
  '读取站点后端状态及日志。',
  object({ appId: uuid }),
  async (a, p, s) => p.request('/apps/' + id(a, 'appId') + '/site-runtime', { signal: s }),
);
tool(
  'enterprise_site_activate',
  '更新既有 TEST 分享链接使用的版本，不扩大受众或数据权限。',
  object({ appId: uuid, versionId: uuid }),
  async (a, p, s) => {
    const share = await p.request<{ revision: number }>('/apps/' + id(a, 'appId') + '/sharing', {
      signal: s,
    });
    return post(
      p,
      '/apps/' + id(a, 'appId') + '/site-runtime/activate',
      { versionId: a['versionId'], expectedRevision: share.revision },
      s,
    );
  },
  false,
);
tool(
  'enterprise_build',
  '构建指定不可变应用版本，使用平台固定编译服务；不接收 shell 命令。',
  object({ versionId: uuid }),
  async (a, p, s) => post(p, '/app-versions/' + id(a, 'versionId') + '/builds', undefined, s),
  false,
);
tool(
  'enterprise_deployment_status',
  '查询构建或正式部署的状态及日志，buildId/deploymentId 二选一。',
  object({ buildId: uuid, deploymentId: uuid }, []),
  async (a, p, s) => {
    if (Boolean(a['buildId']) === Boolean(a['deploymentId']))
      throw new PlatformError('INVALID_TOOL_ARGUMENTS', 400);
    return p.request(
      a['deploymentId']
        ? '/deployments/' + id(a, 'deploymentId')
        : '/build-jobs/' + id(a, 'buildId'),
      { signal: s },
    );
  },
);
tool(
  'enterprise_preview',
  '获取指定版本的实际 TEST 预览入口和构建信息。',
  object({ appId: uuid, versionId: uuid }),
  async (a, p, s) => {
    const r = await p.request<S['StudioPreview']>(
      '/apps/' + id(a, 'appId') + '/preview/' + id(a, 'versionId'),
      { signal: s },
    );
    return {
      appId: r.appId,
      versionId: r.versionId,
      buildId: r.buildId,
      environment: r.environment,
      previewUrl: href(p, r.appId, r.versionId),
      manifest: r.manifest,
    };
  },
);
tool(
  'enterprise_report_create',
  '创建可选的报表语义资源；自定义报表页面仍可通过服务器文件编写。',
  schemas.StudioReportCreate,
  async (a, p, s) => post(p, '/reports', a, s),
  false,
);
tool(
  'enterprise_report_update',
  '校验并保存新的报表定义版本。',
  object({ reportId: uuid, config: schemas.ReportDefinition }),
  async (a, p, s) =>
    post(p, '/reports/' + id(a, 'reportId') + '/versions', { config: a['config'] }, s),
  false,
);
tool(
  'enterprise_report_preview',
  '获取报表所属应用版本的 TEST 预览地址。',
  object({ appId: uuid, versionId: uuid }),
  async (a, p, s) => {
    await p.request('/apps/' + id(a, 'appId') + '/preview/' + id(a, 'versionId'), { signal: s });
    return { environment: 'test', previewUrl: href(p, id(a, 'appId'), id(a, 'versionId')) };
  },
);
tool(
  'enterprise_debug_open',
  '在服务器真实浏览器打开已构建的 TEST 版本，后续可检查、操作和截图。',
  object({ appId: uuid, ...schemas.StudioDebugOpen.properties }, [
    'appId',
    ...schemas.StudioDebugOpen.required,
  ]),
  async (a, p, s) => {
    const { appId, ...body } = a;
    return post(p, '/apps/' + String(appId) + '/debug-sessions', body, s);
  },
  false,
);
tool(
  'enterprise_debug_status',
  '读取浏览器状态、控制台、JS 异常、查询、DOM 检查和待完成操作。',
  object({ sessionId: uuid }),
  async (a, p, s) => p.request('/debug-sessions/' + id(a, 'sessionId'), { signal: s }),
);
tool(
  'enterprise_debug_action',
  '操作应用页面：点击、填值、选择、键鼠、滚动、尺寸、DOM/样式检查和浏览器内 evaluate。',
  object({ sessionId: uuid, action: schemas.StudioDebugAction }),
  async (a, p, s) => post(p, '/debug-sessions/' + id(a, 'sessionId') + '/actions', a['action'], s),
  false,
);
tool(
  'enterprise_debug_screenshot',
  '获取真实 PNG 截图，以 MCP 标准图片内容返回；支持整页、视口和指定元素。',
  object({ sessionId: uuid, fullPage: { type: 'boolean' }, selector: text }, ['sessionId']),
  async (a, p, s) => {
    const query = new URLSearchParams({
      fullPage: String(a['fullPage'] !== false),
      ...(a['selector'] ? { selector: id(a, 'selector') } : {}),
    });
    return p.request<S['StudioDebugScreenshot']>(
      '/debug-sessions/' + id(a, 'sessionId') + '/screenshot?' + query.toString(),
      { signal: s },
    );
  },
  true,
  false,
  true,
);
tool(
  'enterprise_debug_close',
  '关闭当前用户的远程调试浏览器会话。',
  object({ sessionId: uuid }),
  async (a, p, s) => post(p, '/debug-sessions/' + id(a, 'sessionId') + '/close', undefined, s),
  false,
);
tool(
  'enterprise_release_options',
  '读取实际可选审批人、部门与上线申请选项。',
  object({}),
  async (_a, p, s) => p.request('/release-options', { signal: s }),
);
tool(
  'enterprise_release_submit',
  '冻结指定已测试版本并提交上线申请；仅提交申请，不审批或自动发布。',
  schemas.Stage06CreateRelease,
  async (a, p, s) => {
    const draft = (await post(p, '/release-requests', a, s)) as S['Stage06Release'];
    return post(p, '/release-requests/' + draft.id + '/submit', undefined, s);
  },
  false,
);
tool(
  'enterprise_release_status',
  '查询当前用户有权查看的上线申请、审批记录与发布状态。',
  object({ releaseRequestId: uuid }),
  async (a, p, s) => p.request('/release-requests/' + id(a, 'releaseRequestId'), { signal: s }),
);

export const enterpriseTools: readonly EnterpriseTool[] = all;
export function success(value: unknown, image = false): CallToolResult {
  if (image) {
    const { base64, mediaType, ...metadata } = value as S['StudioDebugScreenshot'];
    return {
      content: [
        { type: 'text', text: JSON.stringify({ ok: true, data: metadata }) },
        { type: 'image', data: base64, mimeType: mediaType },
      ],
      structuredContent: { ok: true, data: metadata },
    };
  }
  const data = JSON.parse(JSON.stringify(value ?? null)) as JSONObject;
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: true, data }) }],
    structuredContent: { ok: true, data },
  };
}
