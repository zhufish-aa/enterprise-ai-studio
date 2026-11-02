export interface FailureDetail {
  field: string;
  reason: string;
}
export interface FailureInfo {
  code: string;
  message: string;
  action: string;
  operation?: string;
  status?: number;
  requestId?: string;
  traceId?: string;
  details?: FailureDetail[];
}
type Context = Omit<Partial<FailureInfo>, 'code' | 'message' | 'action'>;
const advice: Record<string, [string, string]> = {
  INVALID_CREDENTIALS: [
    '账号或密码错误，请重新输入。',
    '检查账号和密码；忘记密码时联系管理员重置。',
  ],
  AUTH_RATE_LIMITED: ['登录尝试过于频繁，请稍后再试。', '稍等后再登录。'],
  AUTH_BUSY: ['登录服务繁忙，请稍后再试。', '稍等后重试。'],
  PASSWORD_AUTH_DISABLED: ['服务尚未启用账号登录，请联系管理员。', '请管理员启用账号登录。'],
  PASSWORD_POLICY: ['密码需为 12–128 个字符，且不能与原密码相同。', '重新设置符合要求的新密码。'],
  PASSWORD_CHANGE_REQUIRED: ['请先修改临时密码。', '设置自己的密码后继续使用。'],
  INVITATION_INVALID: ['邀请码无效、已使用或已过期，请联系管理员。', '向管理员获取新的邀请码。'],
  INVITATION_REQUIRED: ['当前组织注册需要邀请码。', '获取管理员提供的邀请码后重新注册。'],
  REGISTRATION_SETTINGS_CHANGED: ['注册设置已被更新，请刷新后重试。', '重新读取当前设置后再保存。'],
  REGISTRATION_ROLE_INVALID: [
    '注册角色的权限配置已变更，请联系管理员。',
    '检查业务成员角色的权限配置。',
  ],
  ACCOUNT_UNAVAILABLE: ['此账号名称不可使用，请换一个账号。', '修改账号名称后重新注册。'],
  CSRF_REJECTED: ['页面会话已更新，请刷新后重试。', '刷新页面后重新操作。'],
  DEBUG_WORKER_UNAVAILABLE: [
    '远程浏览器服务未配置或未启动。',
    '启动 preview-worker 并检查 PREVIEW_WORKER_URL、密钥和 TLS 配置。',
  ],
  DEBUG_BROWSER_NOT_INSTALLED: [
    '远程浏览器运行组件尚未安装。',
    '在服务器执行 pnpm --filter @eas/preview-worker browser:install 后重新打开调试。',
  ],
  DEBUG_SESSION_NOT_FOUND: [
    '该远程调试会话已失效。',
    '服务重启后调试会话不会恢复，请为同一应用版本重新打开会话。',
  ],
  DEBUG_NOT_READY: [
    '远程浏览器尚未就绪或已经结束。',
    '读取 enterprise_debug_status，等待 ready；失败时按会话日志处理。',
  ],
  DEBUG_BROWSER_OPERATION_FAILED: [
    '远程页面操作失败。',
    '查看具体操作、选择器和控制台错误，必要时先 inspect 页面结构。',
  ],
  UNAUTHENTICATED: [
    '登录凭证已过期或已撤销。',
    '网页重新登录；Harness 在服务器设置中更新个人令牌。',
  ],
  FORBIDDEN: [
    '当前身份没有执行此操作所需的权限。',
    '确认当前组织和账号，并检查该操作所需的角色权限。',
  ],
  NOT_FOUND: [
    '当前组织中找不到该资源，或当前用户没有该资源的访问授权。',
    '核对应用或数据集 ID、当前组织，以及该资源的成员和数据集授权。',
  ],
  RESOURCE_GRANT_EXPIRED: [
    '当前账号的资源授权已到期。',
    '在访问权限中更新此账号对应资源、操作和字段范围的授权；详情中的 expiresAt 是原到期时间。',
  ],
  RESOURCE_GRANT_REQUIRED: [
    '当前账号缺少所需资源授权，或资源不在当前组织。',
    '检查详情中的 resourceId 和 permission，在访问权限中配置当前账号的对应授权。',
  ],
  VERSION_METADATA_ACCESS_DENIED: [
    '此版本包含当前账号无权查看的字段或指标。',
    '根据 queryKey 和 datasetId 检查数据集读取授权中的字段与指标范围。',
  ],
  INVALID_FILTER_BINDING: [
    '日期筛选与该版本的查询绑定不一致。',
    '在 studio.manifest.json 的对应查询中配置 timeRange，日期字段必须与运行时一致；提交并重新构建版本。',
  ],
  INVALID_QUERY_BINDING: [
    '页面请求的查询未绑定到此应用版本。',
    '核对 queryKey、datasetId 和 datasetVersionId，与 studio.manifest.json 保持一致后重新构建。',
  ],
  VALIDATION_ERROR: [
    '提交参数不符合接口格式。',
    '按下方字段说明修正参数；不要重试相同的无效请求。',
  ],
  INVALID_TOOL_ARGUMENTS: ['AI 工具参数不符合要求。', '按下方字段说明修正工具参数，再次调用。'],
  INVALID_UI_ARGUMENTS: [
    '界面提交的参数不符合要求。',
    '检查必填项、UUID 和字段类型；如果仍失败，复制详细信息用于定位。',
  ],
  QUERY_REJECTED: [
    '查询引用的字段、指标或筛选条件不符合数据集定义。',
    '重新读取数据集 Schema，使用实际存在且当前用户获授权的字段与指标。',
  ],
  DATA_SCOPE_DENIED: [
    '当前用户尚未配置该数据集需要的部门数据范围。',
    '在组织成员的数据范围中配置实际部门；管理员身份也需要明确的数据范围配置。',
  ],
  QUERY_POLICY_REQUIRED: [
    '该数据集版本尚未配置查询策略。',
    '在平台为此数据集版本配置字段、行范围和查询限制后再预览。',
  ],
  POLICY_CHANGED: [
    '查询期间的数据授权或版本配置已变更。',
    '刷新页面读取最新版本和授权，再重新查询。',
  ],
  QUERY_TIMEOUT: ['查询执行超时。', '缩小日期或筛选范围后重试；持续超时请检查数据库负载。'],
  QUERY_CAPACITY_EXCEEDED: ['查询服务当前并发已满。', '稍后重试；页面应排队执行图表查询。'],
  PREVIEW_QUEUE_FULL: ['页面等待执行的查询过多。', '停止重复刷新，等待当前查询完成后再试。'],
  CONNECTION_FAILED: [
    '数据库连接失败，查询未执行。',
    '管理员检查物理连接的主机、端口、账号状态和数据库服务，并执行连接测试。',
  ],
  CONNECTION_TIMEOUT: ['连接数据库或读取数据超时。', '检查数据库连通性、负载和连接超时配置。'],
  CREDENTIAL_UNAVAILABLE: [
    '查询服务无法读取该连接的数据库凭据。',
    '管理员检查凭据引用和查询服务的凭据存储配置。',
  ],
  CREDENTIAL_STORE_UNAVAILABLE: [
    '后台无法读取当前环境的加密凭据存储。',
    '检查 API 和查询服务使用的目录、密钥及服务账号读写权限。',
  ],
  NETWORK_ADDRESS_FORBIDDEN: [
    '数据库地址与已登记的连接地址不一致。',
    '管理员重新保存实际主机、端口及网络配置，再执行连接测试。',
  ],
  PRODUCTION_AUTHORIZATION_REQUIRED: [
    '此业务请求没有有效的生产发布与数据授权。',
    '开发和预览使用 TEST；正式运行需完成发布审批和生产授权。',
  ],
  WORKSPACE_REVISION_CONFLICT: [
    '服务器源码已被其他操作更新，本次保存未覆盖任何文件。',
    '重新读取最新文件，合并本次修改，并使用最新 revision 保存。',
  ],
  WORKSPACE_EDIT_CONFLICT: [
    '指定的替换文本不存在或出现多次。',
    '重新读取目标文件，提供唯一匹配的 oldText 后再编辑。',
  ],
  WORKSPACE_PROJECT_INCOMPLETE: [
    '服务器项目缺少入口文件或项目清单。',
    '创建 src/main.tsx 和 studio.manifest.json 后再提交版本。',
  ],
  WORKSPACE_MANIFEST_INVALID: [
    'studio.manifest.json 不是有效 JSON。',
    '修正该文件的 JSON 语法，再提交版本。',
  ],
  SOURCE_PATH_REJECTED: [
    '源码文件路径或扩展名不受当前构建配置支持。',
    '使用 src/ 下的 ts、tsx、css，或根目录 package.json、README.md、studio.manifest.json。',
  ],
  SOURCE_LIMIT_EXCEEDED: [
    '源码超过当前项目构建配置的文件数量或大小上限。',
    '移除 node_modules 和构建产物，检查单文件 128 KiB、合计 512 KiB、最多 200 文件。',
  ],
  API_ADDRESS_REJECTED: [
    '后台地址格式或协议不正确。',
    '填写完整 HTTPS 地址；本机服务可启用 localhost / 127.0.0.1 HTTP。',
  ],
  HARNESS_CONNECTION_UNAVAILABLE: [
    'Harness 插件客户端未连接到插件服务。',
    '重启 Harness 并确认企业站点插件已启用。',
  ],
  PROJECT_DIRECTORY_REQUIRED: [
    '尚未指定本地导入的项目目录。',
    '服务器编辑无需本地目录；需要导入时，填写完整项目目录。',
  ],
  PROJECT_DIRECTORY_NOT_FOUND: [
    '本地导入的项目文件夹不存在。',
    '检查 projectPath，指向包含 src 和 studio.manifest.json 的项目目录。',
  ],
  WORKSPACE_FILE_REJECTED: [
    '待导入的文件无法作为普通源码文件读取。',
    '检查符号链接、硬链接、二进制文件或超大文件；也可以直接编辑服务器源码。',
  ],
  TOKEN_STORE_UNAVAILABLE: [
    '插件无法读取当前用户保存的令牌。',
    '在服务器设置中重新保存个人令牌，检查配置目录与当前系统用户的读取权限。',
  ],
  TOKEN_STORE_REJECTED: [
    '插件令牌存储配置无效。',
    '在服务器设置中重新保存令牌，确认配置使用普通文件。',
  ],
  TOKEN_STORE_INVALID: ['插件中保存的令牌内容无效。', '在服务器设置中重新填写网页签发的个人令牌。'],
  TOKEN_STORE_FAILED: [
    '令牌未能保存到本机凭据存储。',
    '检查磁盘空间和配置目录的写入权限，再保存。',
  ],
  NEW_CONNECTION_REQUIRES_TOKEN: [
    '连接新服务器时需要提供该服务器的访问令牌。',
    '在目标平台创建个人令牌，填写到服务器设置后连接。',
  ],
  ORGANIZATION_ACCESS_REQUIRED: [
    '当前账号尚未加入公司，无法连接工作台。',
    '请让管理员将此账号加入公司后重新连接。',
  ],
  PLATFORM_NOT_CONFIGURED: [
    '尚未配置企业平台。',
    '打开“站点 → 服务器设置”，填写服务器地址和访问令牌。',
  ],
  UPLOAD_CONFIRMATION_EXPIRED: [
    '手工导入的文件快照已经过期或已使用。',
    '重新检查项目文件，再执行上传。',
  ],
  CONNECTION_CHANGED: ['操作期间平台服务器配置已切换。', '确认当前平台配置后重新执行此次操作。'],
  DEPENDENCY_UNAVAILABLE: [
    '后台依赖服务暂时不可用。',
    '检查平台数据库、查询服务和构建服务的运行状态，并按请求编号定位。',
  ],
  PLATFORM_UNAVAILABLE: ['无法连接企业平台后台。', '检查后台是否启动、服务器地址及端口是否正确。'],
  REQUEST_TIMEOUT: [
    '等待平台响应超时。',
    '检查后台服务和网络；较慢操作可在服务器设置中调整请求超时。',
  ],
  REQUEST_CANCELLED: ['请求已取消。', '需要时重新发起操作。'],
  QUERY_CANCELLED: ['查询已取消。', '切换筛选或刷新后会发起新查询。'],
  USER_SESSION_REQUIRED: ['此工具缺少当前会话身份。', '从已登录的 Harness 会话调用企业平台工具。'],
  APPROVAL_POLICY_REQUIRED: [
    '本次上线申请尚未选择审批人。',
    '在当前申请表的审批人区域选择负责人后提交。',
  ],
  APPROVAL_POLICY_INVALID: [
    '审批流程配置不完整或阶段标识重复。',
    '核对阶段名称、审批人及其当前审批权限。',
  ],
  APPROVAL_REVIEWER_UNAVAILABLE: [
    '所选审批人已停用、离开组织或失去审批权限。',
    '在当前申请表重新选择有效审批人。',
  ],
  BUILD_NOT_STARTED: [
    '此源码版本尚未构建，暂时没有预览产物。',
    '在申请页点击构建并预览，或直接构建并提交审批。',
  ],
  BUILD_IN_PROGRESS: ['此源码版本正在排队或构建。', '等待当前构建完成，页面会显示构建状态。'],
  BUILD_FAILED: ['此源码版本最近一次构建未成功。', '查看构建错误，修正源码或恢复构建服务后重试。'],
  BUILD_WORKER_NOT_CONFIGURED: [
    '后台尚未配置构建服务。',
    '启动或配置平台固定构建服务，再构建所选版本。',
  ],
  BUILD_WORKER_UNAVAILABLE: [
    '后台构建服务没有响应，此版本尚未完成构建。',
    '检查构建服务是否启动，再点击构建此版本。',
  ],
  BUILD_LEASE_EXPIRED: ['构建执行中断或租约超时。', '恢复构建服务后，重新构建该源码版本。'],
  BUILD_ARTIFACT_UNAVAILABLE: [
    '该源码版本的构建产物不可用。',
    '重新构建此版本，不需要重新创建应用。',
  ],
  RELEASE_BUILD_NOT_READY: [
    '上线申请所选版本尚无可用的成功构建。',
    '在申请表完成所选版本的构建，再提交申请。',
  ],
  RELEASE_VERSION_NOT_FOUND: [
    '所选源码版本在当前组织中不存在。',
    '刷新版本列表，选择当前应用的实际版本。',
  ],
  APP_MAINTENANCE_REQUIRED: [
    '当前账号不是该应用的开发者或维护者。',
    '由应用维护者提交，或在应用成员中授予对应维护权限。',
  ],
  RELEASE_SOURCE_UNAVAILABLE: [
    '所选版本的已保存源码文件不可用。',
    '检查该版本的源码存储，恢复原文件或提交新版本。',
  ],
  RELEASE_DATASET_GRANT_REQUIRED: [
    '申请人缺少该数据集的读取或TEST查询授权。',
    '在数据集权限中补齐提示的具体授权后再提交。',
  ],
  RELEASE_DATASET_UNAVAILABLE: [
    '申请引用的数据集版本已不存在或已停用。',
    '检查对应数据集状态和版本，再选择有效版本提交。',
  ],
  RELEASE_AUDIENCE_DATA_ACCESS_REQUIRED: [
    '目标使用成员尚未获得所需数据集的读取授权。',
    '为提示的成员配置数据集权限，或从使用成员中移除该成员，再发布。',
  ],
  SELF_APPROVAL_FORBIDDEN: [
    '申请人不能审批自己的上线申请。',
    '在当前申请表选择其他有审批权限的成员。',
  ],
  APPROVAL_OUT_OF_ORDER: [
    '当前还未流转到你的审批阶段。',
    '刷新申请，按页面显示的当前阶段和审批人继续。',
  ],
  RELEASE_NOT_APPROVED: [
    '该版本尚未完成有效审批。',
    '先完成申请中全部审批阶段，再由发布负责人执行部署。',
  ],
  RELEASE_SCOPE_INVALID: [
    '申请的数据范围与版本或当前授权不一致。',
    '核对引用数据集、字段、指标及指标底层字段，重新读取当前授权。',
  ],
  RELEASE_AUDIENCE_INVALID: [
    '使用成员与所声明部门不一致。',
    '调整目标部门或使用成员，确保成员当前属于所选部门。',
  ],
  SENSITIVE_FIELD_DECLARATION_REQUIRED: [
    '申请使用了尚未声明的敏感字段。',
    '将这些字段列入敏感字段声明，交由数据负责人审核。',
  ],
  RELEASE_CONTENT_CHANGED: [
    '版本、产物或审批清单的内容哈希不一致。',
    '保留当前运行版本，核对封存产物并为正确版本重新申请。',
  ],
  RELEASE_POLICY_CHANGED: [
    '审批后数据策略或生产映射发生了变化。',
    '基于当前数据策略和映射创建新申请，不复用旧审批。',
  ],
  SCHEMA_INCOMPATIBLE: [
    '生产数据库结构与已批准的结构不兼容。',
    '查看字段详情，修正生产结构并同步元数据后重新申请或重试。',
  ],
  PRODUCTION_CONNECTOR_NOT_CONFIGURED: [
    '平台尚未配置生产查询执行服务。',
    '由平台运维配置生产 connector 及双向 TLS，再重试部署。',
  ],
  PRODUCTION_MAPPING_NOT_CONFIGURED: [
    '本次发布的数据源尚未配置生产环境映射。',
    '上线申请和审批可以先完成；实际发布前，在数据源连接中配置生产环境映射并同步元数据。',
  ],
  DEPLOYMENT_WORKER_NOT_CONFIGURED: [
    '平台尚未配置受控部署服务。',
    '由平台运维配置 deployment worker，再重试当前部署任务。',
  ],
  DEPLOYMENT_ARTIFACT_INVALID: [
    '部署产物未通过内容或浏览器隔离配置校验。',
    '重新构建固定静态版本，核对内容哈希与 CSP 配置。',
  ],
  DEPLOYMENT_HEALTH_FAILED: [
    '部署产物健康检查未通过，原正式版本已保留。',
    '检查部署服务的产物存储与健康记录，然后重试部署。',
  ],
  DEPLOYMENT_ATTESTATION_INVALID: [
    '部署校验凭证与审批版本不一致。',
    '检查部署服务配置与封存产物，不手动切换生产版本。',
  ],
  DEPLOYMENT_DEPENDENCY_UNAVAILABLE: [
    '部署所需的服务未响应，原正式版本已保留。',
    '检查生产 connector、部署 worker 和网络，恢复后重试同一任务。',
  ],
  RELEASE_DEPENDENCY_UNAVAILABLE: [
    '发布操作依赖的后台服务暂不可用。',
    '按请求和追踪编号检查发布服务日志，恢复后重试。',
  ],
  RELEASE_WORKFLOW_NOT_ENABLED: [
    '正式上线申请尚未启用。',
    '当前可保存版本并构建 TEST 预览，待发布审批阶段启用后提交。',
  ],
  PLATFORM_INVALID_RESPONSE: [
    '后台返回了无法识别的响应。',
    '检查平台地址是否指向 API 服务，确认反向代理没有返回登录页或 HTML 错误页。',
  ],
};
export function failureInfo(code: string, context: Context = {}): FailureInfo {
  const safe = /^[A-Z_]{1,80}$/.test(code) ? code : 'ENTERPRISE_REQUEST_FAILED';
  const [message, action] = advice[safe] ?? [
    '操作未完成，服务没有提供更具体的业务原因。',
    '根据操作名称、错误码和追踪编号检查后台记录；不要将此错误直接当作权限不足。',
  ];
  return { code: safe, message, action, ...context };
}
export function formatFailure(info: FailureInfo): string {
  return [
    (info.operation ? info.operation + '：' : '') + info.message,
    ...(info.details ?? []).map((detail) => detail.field + '：' + detail.reason),
    '处理方法：' + info.action,
    '错误码：' + info.code + (info.status ? ' · HTTP ' + info.status : ''),
    ...(info.requestId ? ['请求编号：' + info.requestId] : []),
    ...(info.traceId ? ['追踪编号：' + info.traceId] : []),
  ].join('\n');
}
export function responseFailure(
  code: string,
  status: number,
  operation: string,
  value: unknown,
): FailureInfo {
  const body = value as {
    error?: { message?: unknown; requestId?: unknown; details?: unknown };
    traceId?: unknown;
  } | null;
  const identifier = (input: unknown) =>
    typeof input === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(input) ? input : undefined;
  const requestId = identifier(body?.error?.requestId),
    traceId = identifier(body?.traceId);
  const details: FailureDetail[] = Array.isArray(body?.error?.details)
    ? body.error.details.slice(0, 8).flatMap((raw: unknown) => {
        const detail = raw as Partial<FailureDetail> | null;
        return typeof detail?.field === 'string' &&
          /^[a-zA-Z0-9_./~[\]-]{0,200}$/.test(detail.field) &&
          typeof detail.reason === 'string' &&
          detail.reason.length <= 500 &&
          !/[\r\n\x00-\x1f]|(?:password|bearer|postgres(?:ql)?|mysql|sqlserver):/i.test(
            detail.reason,
          )
          ? [{ field: detail.field, reason: detail.reason }]
          : [];
      })
    : [];
  const info = failureInfo(code, {
    status,
    operation,
    ...(requestId ? { requestId } : {}),
    ...(traceId ? { traceId } : {}),
    ...(details.length ? { details } : {}),
  });
  const message = body?.error?.message;
  // API Fault.safeMessage is the contextual business reason. Preserve it rather
  // than replacing it with a generic code description, while filtering secrets.
  return typeof message === 'string' &&
    message !== code &&
    message.length > 0 &&
    message.length <= 800 &&
    !/[\r\n\x00-\x1f]|(?:password|bearer|postgres(?:ql)?|mysql|sqlserver):|(?:password|token|secret)\s*=/i.test(
      message,
    )
    ? { ...info, message }
    : info;
}
export function schemaFailureDetails(
  errors:
    | readonly { instancePath: string; keyword: string; params: Record<string, unknown> }[]
    | null
    | undefined,
): FailureDetail[] {
  return (errors ?? []).slice(0, 8).map((error) => {
    const key = error.keyword === 'required' ? error.params['missingProperty'] : undefined;
    const field =
      error.instancePath +
        (typeof key === 'string' && /^[a-zA-Z0-9_]{1,80}$/.test(key) ? '/' + key : '') || '/';
    const reason =
      error.keyword === 'required'
        ? '缺少必填字段'
        : error.keyword === 'type'
          ? '字段类型不正确，应为 ' + String(error.params['type'])
          : error.keyword === 'additionalProperties'
            ? '包含接口未定义的字段'
            : error.keyword === 'format'
              ? '字段格式不正确，应为 ' + String(error.params['format'])
              : '不满足 ' + error.keyword + ' 校验规则';
    return { field, reason };
  });
}
