import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-attachment';
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools';
import Schema from '@deepseek-ai/schemastery';
import { Ajv } from 'ajv';
import {
  PlatformClient,
  PlatformError,
  failureInfo,
  schemaFailureDetails,
  type S,
} from '@eas/platform-sdk';
import { collectProject } from './workspace.js';
import { modelSchema } from './model-schema.js';
import { createSitesHost } from './sites-host.js';
import { registerEnterpriseSkill } from './skill.js';
import schemas from './tool-schemas.json' with { type: 'json' };
import debugSchemas from './debug-schemas.json' with { type: 'json' };
export const name = 'enterprise-ai-studio';
export const inject = ['tools', 'skills', 'attachments'];
export interface Config {
  apiUrl: string;
  portalUrl: string;
  organizationId: string;
  workspaceRoot: string;
  tokenFile: string;
  timeoutMs: number;
  allowLocalHttp: boolean;
  logLevel: 'silent' | 'error';
}
export const Config: Schema<Config> = Schema.object({
  apiUrl: Schema.string().default(''),
  portalUrl: Schema.string().default(''),
  organizationId: Schema.string().default(''),
  workspaceRoot: Schema.string().default(homedir()),
  tokenFile: Schema.string().default(join(homedir(), '.dsh', 'enterprise-ai-studio', 'token')),
  timeoutMs: Schema.number().default(15000),
  allowLocalHttp: Schema.boolean().default(false),
  logLevel: Schema.union(['silent', 'error']).default('error'),
});
const uuid = {
    type: 'string',
    pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
  },
  text = { type: 'string', minLength: 1, maxLength: 200 },
  object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  });
export async function apply(ctx: Context, config: Config): Promise<void> {
  registerEnterpriseSkill(ctx);
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1000 || config.timeoutMs > 60000)
    throw new Error('TIMEOUT_CONFIG_REJECTED');
  if (config.portalUrl) {
    const portal = new URL(config.portalUrl);
    if (
      (portal.protocol !== 'https:' &&
        !(
          config.allowLocalHttp &&
          portal.protocol === 'http:' &&
          ['127.0.0.1', 'localhost'].includes(portal.hostname)
        )) ||
      portal.username ||
      portal.password
    )
      throw new Error('PORTAL_ADDRESS_REJECTED');
  }
  const sites = await createSitesHost(ctx, config),
    client = {
      request: <T>(path: string, options: Parameters<PlatformClient['request']>[1]) =>
        sites.client().request<T>(path, options),
      upload: (...args: Parameters<PlatformClient['upload']>) => sites.client().upload(...args),
      build: (...args: Parameters<PlatformClient['build']>) => sites.client().build(...args),
    },
    ajv = new Ajv({ strict: false, coerceTypes: false, removeAdditional: false });
  const id = (a: Record<string, unknown>, key: string) => a[key] as string;
  const href = (appId?: string, versionId?: string) =>
    new URL(
      '/?section=apps' +
        (appId ? '&app=' + appId : '') +
        (versionId ? '&version=' + versionId : ''),
      sites.portalUrl,
    ).href;
  function tool(
    toolName: string,
    description: string,
    parameters: object,
    run: (a: Record<string, unknown>, e: ToolRunContext) => Promise<unknown>,
    render?: ToolDefinition['output']['render'],
  ) {
    const validate = ajv.compile(parameters);
    const definition: ToolDefinition = {
      name: toolName,
      description,
      parameters: modelSchema(parameters) as ToolDefinition['parameters'],
      timeoutMs: config.timeoutMs,
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: render ?? ((_args, value) => [{ type: 'text', text: JSON.stringify(value) }]),
      },
      async execute(args, exec) {
        if (!validate(args))
          return {
            ok: false,
            error: failureInfo('INVALID_TOOL_ARGUMENTS', {
              operation: toolName,
              details: schemaFailureDetails(validate.errors),
            }),
          };
        if (!exec.agent)
          return {
            ok: false,
            error: failureInfo('USER_SESSION_REQUIRED', { operation: toolName }),
          };
        try {
          return {
            ok: true,
            data: JSON.parse(
              JSON.stringify(await run(args as Record<string, unknown>, exec)),
            ) as object,
          };
        } catch (e) {
          const code =
            e instanceof PlatformError
              ? e.code
              : e instanceof Error && /^[A-Z_]{1,80}$/.test(e.message)
                ? e.message
                : 'ENTERPRISE_TOOL_FAILED';
          if (config.logLevel === 'error')
            console.warn(
              JSON.stringify({ event: 'enterprise.tool.failure', tool: toolName, code }),
            );
          return {
            ok: false,
            error:
              e instanceof PlatformError
                ? {
                    ...e.diagnostic,
                    operation:
                      toolName + (e.diagnostic.operation ? ' · ' + e.diagnostic.operation : ''),
                  }
                : failureInfo(code, { operation: toolName }),
          };
        }
      },
      presentCall: () => ({ card: 'generic', title: description }),
    };
    ctx.tools.register(definition);
  }
  const req = (path: string, e: ToolRunContext, body?: unknown) =>
    client.request(path, {
      ...(body !== undefined ? { method: 'POST' as const, body } : {}),
      signal: e.signal,
    });
  tool(
    'enterprise_connection_status',
    '检查企业平台连接及当前用户身份',
    object({}),
    async (_a, e) => ({
      user: await req('/me', e),
      capabilities: await req('/studio/capabilities', e),
      portalUrl: href(),
    }),
  );
  tool(
    'enterprise_portal',
    '获取企业门户入口：应用、数据集、版本和测试预览',
    object({}),
    async () => ({
      portalUrl: href(),
      generation: 'Use Harness native code tools; the platform does not generate code.',
    }),
  );
  tool(
    'enterprise_datasource_list',
    '列出授权逻辑数据源与数据集概要，仅暴露测试能力，不含物理连接',
    object({}),
    async (_a, e) => {
      const [r, d] = await Promise.all([
        req('/logical-data-sources?pageSize=100', e) as Promise<{
          items: S['LogicalDataSource'][];
          nextCursor: string | null;
        }>,
        req('/datasets?pageSize=100', e) as Promise<{
          items: S['Dataset'][];
          nextCursor: string | null;
        }>,
      ]);
      return {
        items: r.items.map((s) => ({
          id: s.id,
          name: s.name,
          systemCode: s.systemCode,
          description: s.description,
          availableEnvironments: ['test'],
          availability: 'query-validation-required',
          datasetSummaries: d.items
            .filter((d) => d.logicalDataSourceId === s.id)
            .map((d) => ({ id: d.id, name: d.name, description: d.description })),
        })),
        truncated: r.nextCursor !== null || d.nextCursor !== null,
      };
    },
  );
  tool(
    'enterprise_dataset_list',
    '列出授权业务数据集，可按逻辑数据源筛选',
    object({ datasourceId: uuid }, []),
    async (a, e) => {
      const r = (await req('/datasets?pageSize=100', e)) as {
        items: S['Dataset'][];
        nextCursor: string | null;
      };
      return {
        items: r.items.filter(
          (d) => !a['datasourceId'] || d.logicalDataSourceId === a['datasourceId'],
        ),
        truncated: r.nextCursor !== null,
      };
    },
  );
  tool(
    'enterprise_dataset_selected',
    '读取当前会话由用户选择的 TEST 数据集并重新检查访问权限',
    object({}),
    async (_a, e) => sites.selected(e.agent!.session.id, e.signal),
  );
  tool(
    'enterprise_dataset_schema',
    '读取授权字段、维度、业务指标口径与关联关系',
    object({ datasetId: uuid }),
    async (a, e) => req('/datasets/' + id(a, 'datasetId') + '/versions', e),
  );
  tool(
    'enterprise_dataset_preview',
    '通过安全网关读取 TEST 数据，不允许 SQL 或生产环境参数',
    object({ query: schemas.QuerySpec }),
    async (a, e) => req('/queries/test', e, { query: a['query'] }),
  );
  tool(
    'enterprise_query_status',
    '读取当前用户测试查询的结果与安全错误状态',
    object({ queryJobId: uuid }),
    async (a, e) => req('/query-jobs/' + id(a, 'queryJobId'), e),
  );
  tool(
    'enterprise_app_create',
    '创建 REPORT 或 SITE 应用，代码由 Harness 在工作区生成',
    schemas.StudioAppCreate,
    async (a, e) => req('/apps', e, a),
  );
  tool('enterprise_app_list', '列出我的企业应用', object({}), async (_a, e) => req('/apps', e));
  tool(
    'enterprise_app_get',
    '读取应用详情、版本和数据绑定及门户入口',
    object({ appId: uuid }),
    async (a, e) => ({
      app: await req('/apps/' + id(a, 'appId'), e),
      versions: await req('/apps/' + id(a, 'appId') + '/versions', e),
      portalUrl: href(id(a, 'appId')),
    }),
  );
  tool(
    'enterprise_app_versions',
    '读取源码版本及变更文件摘要',
    object({ appId: uuid }),
    async (a, e) => req('/apps/' + id(a, 'appId') + '/versions', e),
  );
  tool(
    'enterprise_report_create',
    '创建可选的报表语义资源；页面源码仍由 Harness 生成',
    schemas.StudioReportCreate,
    async (a, e) => req('/reports', e, a),
  );
  tool(
    'enterprise_report_update',
    '验证并保存新的报表定义版本，不生成页面代码',
    object({ reportId: uuid, config: schemas.ReportDefinition }),
    async (a, e) => req('/reports/' + id(a, 'reportId') + '/versions', e, { config: a['config'] }),
  );
  tool(
    'enterprise_report_preview',
    '获取报表所在应用版本的 TEST 门户入口',
    object({ appId: uuid, versionId: uuid }),
    async (a, e) => {
      await req('/apps/' + id(a, 'appId') + '/preview/' + id(a, 'versionId'), e);
      return { environment: 'test', previewUrl: href(id(a, 'appId'), id(a, 'versionId')) };
    },
  );
  tool(
    'enterprise_app_upload',
    '可选：导入指定本地项目；默认使用服务器工作区工具开发，不依赖本地目录白名单',
    object({
      appId: uuid,
      projectPath: {
        type: 'string',
        minLength: 1,
        maxLength: 4000,
        description: 'Absolute project folder, or path relative to current session cwd',
      },
      message: { ...text, maxLength: 500 },
    }),
    async (a, e) => {
      const upload = await collectProject(
        e.agent?.session.header.cwd,
        id(a, 'projectPath'),
        e.signal,
      );
      upload.message = id(a, 'message');
      return client.upload(id(a, 'appId'), upload, e.signal);
    },
  );
  tool(
    'enterprise_workspace_list',
    '列出服务器应用草稿文件及当前 revision，无需本地工作区',
    object({ appId: uuid }),
    async (a, e) => req('/apps/' + id(a, 'appId') + '/workspace', e),
  );
  for (const [suffix, schema, description] of [
    ['read', schemas.ReadServerWorkspaceFile, '读取服务器项目文件内容'],
    [
      'write',
      schemas.WriteServerWorkspace,
      '在服务器创建或覆盖项目文件，支持批量写入；revision防止覆盖他人的修改',
    ],
    ['edit', schemas.EditServerWorkspace, '精确替换服务器文件中的文本，默认匹配唯一位置'],
    ['remove', schemas.RemoveServerWorkspaceFiles, '从服务器草稿删除指定文件，不影响历史版本'],
    ['move', schemas.MoveServerWorkspaceFile, '重命名服务器草稿文件'],
    [
      'checkout',
      schemas.CheckoutServerWorkspace,
      '将指定历史源码版本载入服务器草稿；会替换当前草稿',
    ],
    ['commit', schemas.CommitServerWorkspace, '将服务器草稿提交为不可变新版本，随后可构建和预览'],
  ] as const) {
    tool(
      'enterprise_workspace_' + suffix,
      description,
      object({ appId: uuid, ...schema.properties }, ['appId', ...schema.required]),
      async (a, e) => {
        const { appId, ...body } = a;
        return req('/apps/' + String(appId) + '/workspace/' + suffix, e, body);
      },
    );
  }

  tool(
    'enterprise_build',
    '构建指定版本的前端；配置 runtime 的站点同时构建 server 后端与 db 迁移，不执行项目脚本',
    object({ versionId: uuid }),
    async (a, e) => client.build(id(a, 'versionId'), e.signal),
  );
  tool(
    'enterprise_site_data_sources',
    '读取此站点独立的数据源连接元信息，不返回密码',
    object({ appId: uuid }),
    async (a, e) => req('/apps/' + id(a, 'appId') + '/site-data-sources', e),
  );
  tool(
    'enterprise_site_database_create',
    '为此站点创建独立托管数据库；外部数据库口令由用户在站点数据源界面填写',
    object(
      {
        appId: uuid,
        key: { type: 'string', pattern: '^[a-z][a-z0-9_]{0,62}$' },
        name: text,
        revision: { type: 'integer', minimum: 0 },
      },
      ['appId', 'key', 'name'],
    ),
    async (a, e) =>
      req('/apps/' + id(a, 'appId') + '/site-data-sources', e, {
        key: a['key'],
        name: a['name'],
        mode: 'managed',
        revision: a['revision'] ?? 0,
      }),
  );
  tool(
    'enterprise_site_schema',
    '检查站点数据源连接并读取实际业务表结构',
    object({ appId: uuid, key: text }),
    async (a, e) =>
      req('/apps/' + id(a, 'appId') + '/site-data-sources/inspect', e, { key: a['key'] }),
  );
  tool(
    'enterprise_site_backend_deploy',
    '部署已构建的不可变站点后端版本；执行站点迁移并检查健康状态，仅使用此站点 TEST 数据源',
    object({ appId: uuid, versionId: uuid }),
    async (a, e) =>
      req('/apps/' + id(a, 'appId') + '/site-runtime/deploy', e, { versionId: a['versionId'] }),
  );
  tool(
    'enterprise_site_backend_status',
    '读取此站点后端运行状态、构建摘要和日志',
    object({ appId: uuid }),
    async (a, e) => req('/apps/' + id(a, 'appId') + '/site-runtime', e),
  );
  tool(
    'enterprise_site_activate',
    '在健康检查通过后更新此站点原 TEST 分享链接的代码版本；不会扩大访问范围或批准生产数据',
    object({ appId: uuid, versionId: uuid }),
    async (a, e) => {
      const sharing = (await req('/apps/' + id(a, 'appId') + '/sharing', e)) as {
        revision: number;
      };
      return req('/apps/' + id(a, 'appId') + '/site-runtime/activate', e, {
        versionId: a['versionId'],
        expectedRevision: sharing.revision,
      });
    },
  );
  tool(
    'enterprise_deployment_status',
    '读取构建或正式部署状态与日志；buildId 和 deploymentId 提供一个',
    object({ buildId: uuid, deploymentId: uuid }, []),
    async (a, e) => {
      if (Boolean(a['buildId']) === Boolean(a['deploymentId']))
        throw new PlatformError('INVALID_TOOL_ARGUMENTS', 400);
      return req(
        a['deploymentId']
          ? '/deployments/' + id(a, 'deploymentId')
          : '/build-jobs/' + id(a, 'buildId'),
        e,
      );
    },
  );
  tool(
    'enterprise_preview',
    '获取指定版本的 TEST 预览入口',
    object({ appId: uuid, versionId: uuid }),
    async (a, e) => {
      await req('/apps/' + id(a, 'appId') + '/preview/' + id(a, 'versionId'), e);
      return {
        environment: 'test',
        appId: a['appId'],
        versionId: a['versionId'],
        previewUrl: href(id(a, 'appId'), id(a, 'versionId')),
      };
    },
  );
  tool(
    'enterprise_debug_open',
    '在服务器真实浏览器中打开已构建的 TEST 版本；返回调试会话，等待 ready 后可交互、检查错误和截图',
    object({ appId: uuid, ...debugSchemas.StudioDebugOpen.properties }, [
      'appId',
      ...debugSchemas.StudioDebugOpen.required,
    ]),
    async (a, e) => {
      const { appId, ...body } = a;
      return req('/apps/' + String(appId) + '/debug-sessions', e, body);
    },
  );
  tool(
    'enterprise_debug_status',
    '读取远程浏览器状态、控制台、JavaScript 异常堆栈、查询日志、待完成操作和最近 DOM 检查结果',
    object({ sessionId: uuid }),
    async (a, e) => req('/debug-sessions/' + id(a, 'sessionId'), e),
  );
  tool(
    'enterprise_debug_action',
    '操作远程页面：click/hover/fill/select/press/check/scroll/resize/inspect/wait/reload、key_down/key_up/mouse，以及仅在应用浏览器内 evaluate JavaScript；异步执行后读取 status。selector 使用 Playwright CSS/text/role 选择器',
    object({ sessionId: uuid, action: debugSchemas.StudioDebugAction }),
    async (a, e) => req('/debug-sessions/' + id(a, 'sessionId') + '/actions', e, a['action']),
  );
  tool(
    'enterprise_debug_screenshot',
    '获取远程页面真实 PNG 截图并作为图片返回模型；支持全页、当前视口和指定元素。先等待 pendingQueries/pendingActions 归零再判断最终效果',
    object(
      {
        sessionId: uuid,
        fullPage: { type: 'boolean' },
        selector: { type: 'string', minLength: 1 },
      },
      ['sessionId'],
    ),
    async (a, e) => {
      const image = await sites.client().debugScreenshot(
        id(a, 'sessionId'),
        {
          ...(typeof a['fullPage'] === 'boolean' ? { fullPage: a['fullPage'] } : {}),
          ...(typeof a['selector'] === 'string' ? { selector: a['selector'] } : {}),
        },
        e.signal,
      );
      e.signal.throwIfAborted();
      const attachment = await ctx.attachments.saveImage({
        data: Buffer.from(image.base64, 'base64'),
        mediaType: 'image/png',
        name: 'enterprise-' + image.appId + '-' + image.versionId + '.png',
      });
      const { base64: _base64, ...metadata } = image;
      return {
        ...metadata,
        attachment,
        hostPath: ctx.attachments.imageHostPath(attachment) ?? null,
      };
    },
    (_args, value) => {
      const result = value as unknown as {
        ok: boolean;
        data?: { attachment: import('@deepseek-ai/dsh-attachment').ImageAttachmentRef };
      };
      return result.ok && result.data?.attachment
        ? [
            { type: 'text', text: JSON.stringify(value) },
            { type: 'image', attachment: result.data.attachment },
          ]
        : [{ type: 'text', text: JSON.stringify(value) }];
    },
  );
  tool(
    'enterprise_debug_close',
    '关闭服务器远程调试浏览器；保留应用源码和已提交版本',
    object({ sessionId: uuid }),
    async (a, e) =>
      client.request('/debug-sessions/' + id(a, 'sessionId') + '/close', {
        method: 'POST',
        signal: e.signal,
      }),
  );
  tool(
    'enterprise_release_options',
    '获取当前组织可选择的审批人和上线申请选项；审批人由用户选择，工具不能代替审批',
    object({}),
    async (_a, e) => req('/release-options', e),
  );
  tool(
    'enterprise_release_submit',
    '冻结已测试的应用版本、权限和测试说明并提交上线申请；提交不会自动审批或发布',
    schemas.Stage06CreateRelease,
    async (a, e) => {
      const draft = (await req('/release-requests', e, a)) as S['Stage06Release'];
      return client.request('/release-requests/' + draft.id + '/submit', {
        method: 'POST',
        signal: e.signal,
      });
    },
  );
  tool(
    'enterprise_release_status',
    '查看当前用户有权访问的上线申请、顺序审批和部署状态',
    object({ releaseRequestId: uuid }),
    async (a, e) => req('/release-requests/' + id(a, 'releaseRequestId'), e),
  );
}
