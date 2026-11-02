import type { components } from '@eas/api-contract';
import { failureInfo, formatFailure, responseFailure, type FailureInfo } from '@eas/platform-sdk';
export type S = components['schemas'];
export class ApiError extends Error {
  readonly diagnostic: FailureInfo;
  constructor(
    readonly code: string,
    readonly status: number,
    readonly requestId: string,
    diagnostic?: FailureInfo,
  ) {
    const info = diagnostic ?? failureInfo(code, { status, requestId }),
      message = diagnostic ? info.message : (messages[code] ?? info.message);
    super(formatFailure({ ...info, message }));
    this.diagnostic = { ...info, message };
  }
}
const messages: Record<string, string> = {
  CREDENTIAL_STORE_UNAVAILABLE: '后台无法读取当前环境的加密凭据存储，请检查服务器的凭据存储配置。',
  WORKSPACE_REVISION_CONFLICT: '服务器草稿已更新，请刷新并核对最新文件后保存。',
  WORKSPACE_EDIT_CONFLICT: '替换文本未匹配或出现多次，请先读取最新文件。',
  WORKSPACE_PROJECT_INCOMPLETE: '请先创建 src/main.tsx 和 studio.manifest.json。',
  WORKSPACE_MANIFEST_INVALID: 'studio.manifest.json 格式无效，请修复 JSON。',
  SOURCE_PATH_REJECTED: '请使用项目内的 src/*.ts、tsx、css 或根目录清单/说明文件。',
  SOURCE_LIMIT_EXCEEDED: '源码文件超过当前编译配置的大小或数量上限。',
  PASSWORD_POLICY: '密码至少 12 个字符，最多 128 个字符，且不能与原密码相同。',
  INVALID_CREDENTIALS: '账号或密码不正确，或账号当前不可用。',
  AUTH_RATE_LIMITED: '尝试次数过多，请稍后重试。',
  AUTH_BUSY: '当前登录请求较多，请稍后重试。',
  PASSWORD_CHANGE_REQUIRED: '请先修改临时密码。',
  INVITATION_INVALID: '邀请码已过期、已使用或已撤销，请联系管理员重新获取。',
  ACCOUNT_UNAVAILABLE: '此账号名称不可使用，请换一个账号。',
  CSRF_REJECTED: '会话验证未通过，请刷新页面后重试。',
  PASSWORD_AUTH_DISABLED: '此服务尚未启用账号登录，请联系管理员。',
  TOKEN_ALREADY_ISSUED: '此请求已签发过令牌。完整值无法再次展示，请在列表中撤销后重新创建。',
  TOKEN_LIMIT_REACHED: '已达到令牌数量或今日签发上限，请撤销不再使用的令牌或稍后重试。',
  QUERY_POLICY_REQUIRED: '此数据集版本尚未配置安全查询策略，请联系管理员。',
  DATA_SCOPE_DENIED: '当前账号没有可用的部门数据范围。',
  QUERY_TIMEOUT: '查询超时，执行已取消。',
  QUERY_COST_REJECTED: '查询成本超出允许范围，请缩小筛选范围。',
  QUERY_CAPACITY_EXCEEDED: '当前并发查询已达到上限，请稍后重试。',
  QUERY_RESULT_TOO_LARGE: '结果超过安全大小限制，请减少字段或行数。',
  DATABASE_RLS_REQUIRED: '数据源未满足要求的数据库行安全策略。',
  GATEWAY_ENGINE_UNVERIFIED: '此引擎的查询网关尚未完成真实验证，当前禁止执行。',
  QUERY_GATEWAY_REQUIRED: '旧预览接口已停用，请通过统一查询网关调用。',
  SCHEMA_CHANGED: '数据库结构已变化，请重新同步并审核映射。',
  PRODUCTION_AUTHORIZATION_REQUIRED: '当前没有符合发布、审批、授权和用户权限要求的生产访问上下文。',
  UNAUTHENTICATED: '登录凭证已失效，请重新登录。',
  FORBIDDEN: '当前账号没有执行此操作的权限。',
  NOT_FOUND: '资源不存在，或当前账号尚未获得访问授权。',
  VALIDATION_ERROR: '提交内容不符合要求，请检查必填项与字段格式。',
  STATE_CONFLICT: '当前状态不允许此操作，或存在重复的名称、编码或授权。',
  REVISION_MISMATCH: '此项资料已被更新，请刷新后重新操作。',
  PRECONDITION_REQUIRED: '缺少版本信息，请刷新页面后重试。',
  SCHEMA_MISMATCH: '结构校验未通过。请先完成连接检查与元数据同步，再检查字段类型。',
  RELATION_FORBIDDEN: '所选表或视图超出了此连接的授权范围。',
  ENVIRONMENT_FORBIDDEN: '连接类型或环境不匹配。业务预览仅可使用测试环境。',
  CONNECTION_FAILED: '数据库连接失败，请检查账号配置和服务状态。',
  CONNECTION_TIMEOUT: '连接或读取超时，请检查数据库负载与超时配置。',
  CREDENTIAL_UNAVAILABLE: '凭据当前不可用，请联系凭据管理员。',
  METADATA_SYNC_FAILED: '元数据同步失败，最近一次成功结果仍然保留。',
  NETWORK_ADDRESS_FORBIDDEN: '目标地址未通过网络白名单检查。',
  POLICY_CHANGED: '访问策略已变更，请刷新授权和版本信息后重试。',
  QUERY_REJECTED: '所选字段、指标或过滤条件不在允许范围内。',
  DEPENDENCY_UNAVAILABLE: '连接服务暂时不可用，请检查服务状态后重试。',
  IDEMPOTENCY_CONFLICT: '请求标识发生冲突，请重新提交。',
  LEASE_EXPIRED: '任务执行超时，可重新检查或重试同步。',
};
export const failureMessage = (code: string | null) =>
  messages[code ?? ''] ?? '任务未能完成，请稍后重试。';
export class Api {
  constructor(
    readonly token: string,
    readonly organizationId: string | null,
    readonly csrfToken?: string,
  ) {}
  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; revision?: number; signal?: AbortSignal } = {},
  ): Promise<T> {
    const method = options.method ?? 'GET';
    const response = await fetch('/v1' + path, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}),
        ...(method !== 'GET' && this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
        ...(this.organizationId ? { 'X-Organization-Id': this.organizationId } : {}),
        ...(method !== 'GET' ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(options.revision ? { 'If-Match': '"' + options.revision + '"' } : {}),
      },
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (data as { error?: { code?: string; requestId?: string } } | null)?.error,
        code = error?.code ?? 'DEPENDENCY_UNAVAILABLE';
      throw new ApiError(
        code,
        response.status,
        error?.requestId ?? '',
        responseFailure(code, response.status, method + ' ' + path, data),
      );
    }
    return data as T;
  }
  async list<T>(path: string, signal?: AbortSignal): Promise<T[]> {
    const items: T[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const result: { items: T[]; nextCursor: string | null } = await this.request(
        path +
          (path.includes('?') ? '&' : '?') +
          'pageSize=100' +
          (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
        signal ? { signal } : {},
      );
      items.push(...result.items);
      cursor = result.nextCursor;
      if (++pages > 100) throw new Error('列表超过可显示范围。');
    } while (cursor);
    return items;
  }
}
