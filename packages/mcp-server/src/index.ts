import {
  Server,
  createMcpHandler,
  ProtocolError,
  ProtocolErrorCode,
  type CallToolResult,
  type JSONObject,
  type McpHttpHandler,
} from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { Ajv } from 'ajv';
import {
  PlatformError,
  failureInfo,
  formatFailure,
  responseFailure,
  schemaFailureDetails,
} from '@eas/platform-sdk';
import { enterpriseTools, success } from './tools.js';
import { instructions, developmentGuide } from './guide.js';
import type { McpPlatformPort } from './port.js';
import schemas from './schemas.json' with { type: 'json' };
export type { McpPlatformPort, PlatformRequest } from './port.js';

const ajv = new Ajv({
  strict: false,
  allErrors: false,
  removeAdditional: false,
  coerceTypes: false,
});
ajv.addFormat('uuid', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
ajv.addFormat('date-time', {
  type: 'string',
  validate: (value) => Number.isFinite(Date.parse(value)),
});
const validators = new Map(
  enterpriseTools.map((t) => [t.definition.name, ajv.compile(t.definition.inputSchema)]),
);
const resourceEntries = [
  {
    name: 'enterprise-development-guide',
    uri: 'enterprise://guide',
    mimeType: 'text/plain',
    text: developmentGuide,
  },
  {
    name: 'query-schema',
    uri: 'enterprise://schemas/query',
    mimeType: 'application/schema+json',
    text: JSON.stringify(schemas.QuerySpec, null, 2),
  },
  {
    name: 'source-manifest-schema',
    uri: 'enterprise://schemas/source-manifest',
    mimeType: 'application/schema+json',
    text: JSON.stringify(schemas.SourceManifest, null, 2),
  },
  {
    name: 'report-schema',
    uri: 'enterprise://schemas/report',
    mimeType: 'application/schema+json',
    text: JSON.stringify(schemas.ReportDefinition, null, 2),
  },
];
function failure(error: unknown, operation: string): CallToolResult {
  const diagnostic =
    error instanceof PlatformError
      ? error.diagnostic
      : failureInfo('PLATFORM_REQUEST_FAILED', { operation });
  const detail = { ...diagnostic, operation: diagnostic.operation ?? operation };
  return {
    isError: true,
    content: [{ type: 'text', text: formatFailure(detail) }],
    structuredContent: { ok: false, error: JSON.parse(JSON.stringify(detail)) as JSONObject },
  };
}
/** Instantiate per authenticated HTTP request: no token, user data, results or sessions are shared. */
export function createEnterpriseMcpServer(port: McpPlatformPort) {
  const server = new Server(
    { name: 'enterprise-ai-studio', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} }, instructions },
  );
  server.setRequestHandler('tools/list', async () => ({
    tools: enterpriseTools.map((t) => t.definition),
  }));
  server.setRequestHandler('tools/call', async (request, context) => {
    const name = request.params.name,
      tool = enterpriseTools.find((t) => t.definition.name === name),
      validate = validators.get(name),
      args = request.params.arguments ?? {};
    if (!tool || !validate)
      throw new ProtocolError(ProtocolErrorCode.InvalidParams, '未知企业平台工具：' + name);
    if (!validate(args))
      return failure(
        new PlatformError(
          'INVALID_TOOL_ARGUMENTS',
          400,
          failureInfo('INVALID_TOOL_ARGUMENTS', {
            operation: name,
            details: schemaFailureDetails(validate.errors),
          }),
        ),
        name,
      );
    try {
      context.mcpReq.signal.throwIfAborted();
      return success(await tool.run(args, port, context.mcpReq.signal), tool.image);
    } catch (error) {
      return failure(error, name);
    }
  });
  server.setRequestHandler('resources/list', async () => ({
    resources: resourceEntries.map(({ text: _text, ...metadata }) => metadata),
  }));
  server.setRequestHandler('resources/templates/list', async () => ({ resourceTemplates: [] }));
  server.setRequestHandler('resources/read', async (request) => {
    const resource = resourceEntries.find((r) => r.uri === request.params.uri);
    if (!resource)
      throw new ProtocolError(ProtocolErrorCode.InvalidParams, '不存在这个企业平台资源。');
    return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: resource.text }] };
  });
  server.setRequestHandler('prompts/list', async () => ({
    prompts: [
      {
        name: 'enterprise_sites_development',
        title: '开发企业站点或报表',
        description: '读取服务器开发与调试流程，并结合用户的业务需求。',
        arguments: [{ name: 'requirement', description: '业务需求', required: false }],
      },
    ],
  }));
  server.setRequestHandler('prompts/get', async (request) => {
    if (request.params.name !== 'enterprise_sites_development')
      throw new ProtocolError(ProtocolErrorCode.InvalidParams, '不存在这个开发提示词。');
    return {
      description: '企业平台服务器开发流程',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text:
              developmentGuide +
              '\n用户需求：' +
              JSON.stringify(
                request.params.arguments?.['requirement'] ?? '请先了解我想开发什么网站。',
              ),
          },
        },
      ],
    };
  });
  return server;
}

export function platformResponseError(status: number, operation: string, response: unknown): Error {
  const code = (response as { error?: { code?: unknown } } | null)?.error?.code;
  const safeCode =
    typeof code === 'string' && /^[A-Z_]{1,80}$/.test(code) ? code : 'PLATFORM_REQUEST_FAILED';
  return new PlatformError(
    safeCode,
    status,
    responseFailure(safeCode, status, operation, response),
  );
}
export function createEnterpriseMcpHttp(port: McpPlatformPort): {
  handle: ReturnType<typeof toNodeHandler>;
  close: McpHttpHandler['close'];
} {
  const handler = createMcpHandler(() => createEnterpriseMcpServer(port), {
    legacy: 'stateless',
    responseMode: 'auto',
    maxRequestBodySize: 33_554_432,
  });
  return {
    handle: toNodeHandler(handler, { maxRequestBodySize: 33_554_432 }),
    close: () => handler.close(),
  };
}
