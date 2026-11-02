> 阶段06实现更新：顺序审批、冻结清单、受控静态部署、生产授权与重新审批回滚见 [上线发布说明](releases-guide.md)、[验证范围](stage06-validation.md) 和 ADR0021。下文旧阶段记录保留为历史，当前实现以这些说明和 OpenAPI 为准。

> 2026-10-26：应用版本列表/详情、报表历史以当前应用成员及 dataset.read 字段/指标范围检查元数据，catalog.manage 可按目录管理规则检查结构；不再依赖 TEST 查询授权或连接。执行类接口保留实时数据授权。RESOURCE_GRANT_EXPIRED（403）携带 resourceId、permission、expiresAt；RESOURCE_GRANT_REQUIRED（404）表示当前账号无对应授权或资源不在当前组织；VERSION_METADATA_ACCESS_DENIED（403）指出版本中的越权字段/指标查询绑定。实际故障与本地修复见 [管理员版本访问](admin-version-access.md)。

> 2026-10-30：新增 GET/POST /registration-settings，当前组织的人类 account.manage 管理员配置注册是否需要邀请码，带 revision 与写幂等。/auth/options 返回开放注册组织；/auth/register 支持 invitationCode 或 organizationId 两种互斥入口，事务内按当前设置执行。直接注册的角色固定为普通业务开发成员，不授予数据资源。OpenAPI 共151操作。详见 [账号与注册设置](accounts-guide.md)。

> 阶段03统一查询契约与完整请求示例见[query-gateway.md](query-gateway.md)。OpenAPI104操作，17项标记stage03，33项stage02，1项旧preview标记retired-stage03返回410。QuerySpec已升级包含datasetId、metrics/dimensions/filters/groupBy/orderBy/limit/pagination/timeRange。管理员诊断仅静态授权校验，不提供SQL执行接口。所有查询结果禁止共享缓存；导出另需当前字段/指标导出权限。


> 阶段02实际接口清单如下；后面的阶段00全平台契约仍包含未实现的审批/部署/运行能力。OpenAPI源为 packages/api-contract/openapi.json，生成类型不可手改。

## 已实现数据源 API（前缀 /v1）

| 方法和路径 | 当前角色动作要求 | operationId |
| --- | --- | --- |
| GET /me | session.read | getMe |
| GET /organizations | session.read | listOrganizations |
| GET /organizations/{orgId}/members | permission.manage | listOrganizationMembers |
| GET /logical-data-sources | source.read | listLogicalDataSources |
| POST /logical-data-sources | catalog.manage | createLogicalDataSource |
| GET /physical-connections | connection.manage / human | listPhysicalConnections |
| POST /physical-connections | connection.manage / human | createPhysicalConnection |
| GET /datasets | dataset.read | listDatasets |
| POST /datasets | catalog.manage | createDataset |
| DELETE /resource-grants/{resourceGrantId} | permission.manage / human | deleteResourceGrant |
| POST /physical-connections/{physicalConnectionId}/tests | connection.manage / human | createConnectionTest |
| GET /connection-tests/{connectionTestId} | connection.manage / human | getConnectionTest |
| PUT /logical-data-sources/{logicalDataSourceId}/mappings | mapping.manage / human | setSourceMapping |
| GET /logical-data-sources/{logicalDataSourceId}/mappings | mapping.manage / human | listSourceMappings |
| POST /datasets/{datasetId}/versions | catalog.manage | createDatasetVersion |
| GET /datasets/{datasetId}/versions | dataset.read | listDatasetVersions |
| GET /dataset-versions/{datasetVersionId} | dataset.read | getDatasetVersion |
| GET /logical-data-sources/{logicalDataSourceId} | source.read | getLogicalDataSource |
| PATCH /logical-data-sources/{logicalDataSourceId} | catalog.manage | updateLogicalDataSource |
| PATCH /physical-connections/{physicalConnectionId} | connection.manage / human | updatePhysicalConnection |
| GET /network-endpoints | connection.manage / human | listNetworkEndpoints |
| GET /credential-profiles | connection.manage / human | listCredentialProfiles |
| GET /database-adapters | source.read | listDatabaseAdapters |
| POST /physical-connections/{physicalConnectionId}/metadata-syncs | connection.manage / human | createMetadataSync |
| GET /physical-connections/{physicalConnectionId}/metadata | connection.manage / human | listMetadataSnapshots |
| GET /catalog-jobs/{catalogJobId} | session.read | getCatalogJob |
| POST /catalog-jobs/{catalogJobId}/retry | connection.manage / human | retryCatalogJob |
| GET /datasets/{datasetId} | dataset.read | getDataset |
| PATCH /datasets/{datasetId} | catalog.manage | updateDataset |
| POST /datasets/{datasetId}/preview | dataset.query.test | previewDataset |
| GET /datasets/{datasetId}/grants | permission.manage / human | listDatasetGrants |
| POST /datasets/{datasetId}/grants | permission.manage / human | createDatasetGrant |
| GET /logical-data-sources/{logicalDataSourceId}/grants | permission.manage / human | listSourceGrants |
| POST /logical-data-sources/{logicalDataSourceId}/grants | permission.manage / human | createSourceGrant |

/me 验证身份并返回组织、实时权限和clientKind；/organizations仅返回本人组织。其他目录接口要求Bearer和X-Organization-Id。实际资源、账号状态、环境和当前授权均在服务端检查，x-permissions只表示首层动作；dataset.read/query还需有效资源授权，管理人类权限另外校验。

所有写操作要求UUID Idempotency-Key；幂等记录有效期24小时，同一主体/组织/操作/键对应不同路径或正文/If-Match摘要返回409，重复返回原回执。所有可变源、连接、数据集更新及映射写入要求If-Match: "revision"，缺少428、不匹配412。语义版本与映射追加，不覆盖。DELETE撤权返回200被撤销授权DTO。

列表使用pageSize 1..100（默认20）与签名cursor，响应为{items,nextCursor}；游标15分钟有效，绑定组织/调用者/操作/过滤条件，不能跨账号复用。首版先在服务内过滤权限再分页，目录大规模时应迁移SQL层游标优化。普通清单的前端搜索当前为已加载资源筛选。

连接DTO只包含安全credentialProfileId别名，不含secretRef、username/password、连接串或原始数据库异常。approved endpoint只能管理员浏览，不能通过公开API创建。TEST和production是契约枚举，界面显示TEST/PROD。预览请求没有environment：只能提交版本、维度/指标key、白名单过滤与limit。任务202返回CatalogJob，通过GET /catalog-jobs/{id}读取终态。成功健康只含healthy/checkedAt；元数据成功只含快照ID；预览成功含列描述、行值和truncated。

~~~json
{
  "datasetVersionId": "00000000-0000-4000-8000-000000000001",
  "dimensions": ["region"],
  "metrics": ["sales_total"],
  "filters": [{"fieldKey":"region","operator":"eq","value":"华东"}],
  "limit": 20
}
~~~

错误统一{error:{code,message,requestId}}。400参数/未知字段；401身份无效；403动作/人类/环境拒绝；404资源不可见；409幂等/状态冲突；412版本冲突；422 QUERY_REJECTED/SCHEMA_MISMATCH/RELATION_FORBIDDEN；428缺少If-Match；503依赖不可用。异步失败使用CONNECTION_FAILED、CONNECTION_TIMEOUT、CREDENTIAL_UNAVAILABLE、METADATA_SYNC_FAILED、NETWORK_ADDRESS_FORBIDDEN、POLICY_CHANGED、LEASE_EXPIRED等安全码，不能以HTTP202视为连接成功。

内部POST /v1/internal/catalog/:orgId/:jobId/lease只允许固定环境工作负载签名及mTLS，未作为用户/Harness工具接口公开。worker /execute只接受组织和任务ID，不接受SQL、host或秘密。PROD健康检查只编译SELECT 1；结构同步只读取批准对象系统目录，不提供业务数据查询。

# REST API 契约设计

## 1. 契约入口与实现状态

权威接口定义：`packages/api-contract/openapi.json`，OpenAPI 3.1.1。生成的 TypeScript 在 `packages/api-contract/src/generated.ts`，通过包名 `@eas/api-contract` 导出。共 75 个操作、86 个 schema；每个操作包含请求/响应 schema、状态码、安全声明、权限及资源校验扩展。修改源契约后运行 `pnpm contract:generate`，`pnpm contract:check` 验证规范、操作 ID 唯一性和生成类型一致性。

本阶段仅实现 `GET /v1/healthz` 和始终返回 503 的 `GET /v1/readyz`。业务接口标记 `x-implementation: planned`，访问骨架 API 的业务路径返回 404。此设计不声称已经实现企业登录、业务授权或发布能力。

对外基路径 `/v1`，生产使用企业 HTTPS 入口，本地默认 `http://127.0.0.1:3000/v1`。升级原则：新增可选字段可兼容；删除字段、语义改变或扩大敏感数据输出须新增主版本。不得用同一个查询路径的“兼容参数”悄悄开启生产访问。

## 2. 通用请求与响应

普通请求为 `application/json`，拒绝未知字段；源码上传使用有界 `application/octet-stream`。UUID 使用规范字符串，时间使用 RFC 3339 UTC，枚举区分大小写。资源以单对象返回，列表使用 `{items,nextCursor}`，不嵌套不一致的 data/result 包装。异步任务返回 202 与任务对象，通过状态接口轮询；首版无需 WebSocket。

响应携带 `X-Request-Id`；可变资源 GET/写响应返回强 ETag，例如 `"3"`。PATCH、受保护的 PUT/DELETE 和发布状态转移按契约要求携带 `If-Match`。缺少前置条件为 428，旧 revision 为 412。不可变版本不接受 PATCH。

```json
{
  "error": {
    "code": "APPROVAL_REQUIRED",
    "message": "Release approval requirements are not satisfied.",
    "requestId": "req_0192_example"
  }
}
```

details 仅允许安全的字段路径/原因列表，不返回堆栈、驱动错误、secretRef、SQL、业务数据或连接信息。生产查询使用 202 后失败的业务错误写入 QueryJob.failureCode；HTTP 200 表示成功读取任务状态，不表示查询成功。

## 3. 身份与授权

| 层级 | 规则 |
| --- | --- |
| 用户身份 | Bearer OIDC JWT；校验签名、issuer、audience=`eas-api`、exp/nbf、账号停用及会话撤销；身份取 token subject |
| 组织上下文 | 除 `/me`、组织列表/创建外，必须有 X-Organization-Id，且调用者是该组织有效成员；路径 orgId 必须相同 |
| RBAC | x-permissions 对应 permission key；当前组织角色必须允许动作；不能单凭客户端角色字段授权 |
| 资源边界 | x-resource-check 描述所有权、成员、显式资源 grant、受众、运行授权等附加条件；RBAC 和资源条件同时满足 |
| 审批与管理 | x-human-only 操作限制交互式企业会话，校验授权客户端、amr/acr 和 auth_time；插件 client_id / 服务身份不能审批 |
| 内部 worker | 独立 mTLS 与短期工作负载 token，audience/queue/env 固定，使用单任务租约；不复用用户 API token |

对象不存在或不属于调用者可见范围返回 404，已知可见对象的动作禁止返回 403；不能通过错误文本枚举另一组织资源。只允许系统管理员创建 organization，普通成员只能列出自己组织。创建组织的幂等键先按平台命名空间与调用者存储，成功后归属新组织，不能先信任尚未创建的 org header。

建议初始角色：业务开发者（app/report 创建和测试查询动作）、目录管理员（目录/连接/映射管理）、数据负责人（特定数据集的 release.review）、发布审批者（应用 release.review）、发布操作者（release.deploy）、访问者（app.use/report.view）、审计员（audit.read）。角色不隐含数据集资源授权；开发查询还须有效 dataset.query.test grant。应用成员不自动成为数据源管理员；平台管理员无隐式生产查询捷径。

运行报表采用受限委托：访问者当前 app audience、report.view 资源授权，与活动部署 runtime_grant 相交。数据集个人开发权限不参与生产委托。创建者离职、访问者变更、grant 撤销均重新求值；任何一个失效都拒绝。

## 4. 分页、幂等和并发

列表默认 pageSize=20、上限100；cursor 为签名不透明字符串，绑定调用者、组织、筛选与排序。按 created_at DESC、id DESC seek；成员等无独立 id 的实体按 created_at/user_id 或稳定复合键分页。权限变化后旧 cursor 可以失效，返回 VALIDATION_ERROR；不保证跨页快照隔离，不返回全局总数。

所有变更，包括无 body 的 submit、cancel、deploy，要求 `Idempotency-Key: UUID`。有效期24小时，唯一范围为 `(organization,user,operationId,key)`；request_hash 包含路径 ID、query、规范化 body 和必要请求头。相同键相同请求重放原始状态/响应，不重复副作用；不同请求返回409 IDEMPOTENCY_CONFLICT；正在处理返回409 STATE_CONFLICT 并可按 Retry-After 重试。错误的业务请求不永久占住成功键。业务事实、幂等成功记录和 outbox 在同一事务提交。

先验证身份和当前读取原响应的权限，再查相同请求的已完成幂等结果；已完成合法重放不再次用旧 If-Match 触发状态变更。新请求必须核对 If-Match。审批/部署同时锁 release row 与 app slot，采用有限重试处理死锁。上传二进制以票据、长度和 SHA-256 确认幂等，不能单凭客户端 header 封存制品。

## 5. 功能模块与请求语义

### 5.1 身份和权限

`/me`、`/organizations`、`/organizations/{orgId}/members`、`/roles`、`/permissions`、`/roles/{roleId}/permissions`、`/role-bindings` 和 `/resource-grants` 管理组织身份。资源授权必须绑定 resources 注册项和有效成员；角色授权不得超过管理员的可委派权限上限。删除角色绑定或资源授权须更新 policy_epoch，取消相关查询并清除缓存。

ResourceGrant 表达用户对资源的动作，不接受随意 SQL 条件。首版支持明确用户，组织组/外部用户须通过后续扩展和独立授权规则加入。

### 5.2 应用、源码和构建

`POST /apps` 返回 appId；`POST /artifacts/uploads` 申请上传票据，然后 PUT 返回的同源 uploadPath。上传完成后服务端校验摘要、归属、数量、压缩展开上限、路径和文件类型。`POST /apps/{appId}/versions` 封存 sourceArtifactKey、sourceDigest、manifest、reportVersionIds、collections；服务端生成单调版本号。

manifest 只支持固定 `react-static-v1` 模板、相对入口与声明的数据集版本。collections 定义平台托管记录的 JSON Schema 子集、rowPolicy 和 allowedActions，不允许远程 `$ref`、任意模板表达式、服务器脚本或文件访问。构建使用 `POST /app-versions/{id}/builds`，202 返回 BuildJob，`GET /build-jobs/{id}` 读取状态。插件只能提交请求，不能自行标记 build succeeded。

### 5.3 数据目录和映射

`/logical-data-sources` 定义业务逻辑名；`/physical-connections` 只允许目录管理员维护。连接请求使用预注册 endpointId、databaseName、secretRef；响应无 secretRef，只有 credentialRevision。网络 endpoint 清单由基础设施受控配置导入，不开放 AI 自由填写 host/URL。`POST /physical-connections/{id}/tests` 为管理探测任务，不读取业务行。

`PUT /logical-data-sources/{id}/mappings?environment=test|production` 追加修订并更新 head；environment 只存在于管理映射接口，不能加入业务查询请求。生产映射更新立即使旧运行授权失效。`POST /datasets/{id}/versions` 固定视图、字段、指标、行策略与 schema digest；不接受用户自由 SQL。首版支持一个数据集读取一个视图，不提供任意 JOIN 或跨库联邦查询。

### 5.4 报表

`POST /reports` 绑定 appId。`POST /reports/{id}/versions` 提交 queries/charts。ReportQuery 固定 key、datasetVersionId、dimensions、metrics、allowedFilterKeys；ChartSpec 只有 table/bar/line/pie/stat、标题和字段引用，不能放 HTML 或 formatter 函数。

服务端检查 queryKey 唯一、字段与指标授权、图表引用存在；规范化依赖写入 report_version_datasets。创建新版报表不会自动替换生产配置，必须被新 AppVersion 引用并走发布流程。

### 5.5 测试与运行查询

开发查询：

```http
POST /v1/queries/test
Authorization: Bearer <user-access-token>
X-Organization-Id: 00000000-0000-4000-8000-000000000001
Idempotency-Key: 00000000-0000-4000-8000-000000000002
Content-Type: application/json
```

```json
{
  "appVersionId": "00000000-0000-4000-8000-000000000003",
  "query": {
    "datasetVersionId": "00000000-0000-4000-8000-000000000004",
    "dimensions": ["region"],
    "metrics": ["sales_total"],
    "filters": [{"fieldKey":"month","operator":"eq","value":"2026-10"}],
    "limit": 100
  }
}
```

查询返回202 QueryJob，包含 expiresAt、状态、可空 result 和 failureCode。服务端只解析 test head；追加 environment、SQL 或 physicalConnectionId 会被 schema 拒绝。

生产应用调用 `POST /runtime/apps/{appId}/queries`，允许在已批准范围内提交 QuerySpec；报表调用 `POST /runtime/reports/{reportId}/queries`，仅提交 queryKey 和 filters，完整查询定义从活动部署固定版本读取。生产 limit 省略时使用批准 scope 的行数范围，提供时不得扩大该范围，字段和指标不得超出 scope，筛选值参数化且类型匹配。`GET /query-jobs/{id}` 仅原请求者可读，交付存储结果前再次检当前权限、epoch、slot 和 grant。

每个 query 由服务端绑定 dataset/version、physical mapping、viewer identity 和行策略。TEST 不预设返回行数上限，limit/pageSize 决定本次返回量，未指定时不加 SQL LIMIT；字节预算与超时独立执行；包含 COUNT、SUM 的聚合也须应用行/列权限。查询缓存 key 包含 org、env、deployment、dataset version、规范化 query、访问者/受信行属性摘要、policy epoch；禁止按报表 ID 共用敏感结果缓存。

### 5.6 审批、部署与回滚

`POST /release-requests` 请求固定 appVersionId、buildJobId、reason、scopes 和 audienceUserIds。targetEnvironment 在服务端固定为 production；requester、审批策略和 snapshotDigest 由服务端生成。每个 scope 包含 datasetVersionId、mappingId、字段、指标、rowPolicyKey、maxRows/maxDurationMs，必须是原始授权范围的子集，不能因申请本身获得数据权限。

`POST /release-requests/{id}/submit` 锁定规范化快照；`POST /.../approvals` 仅接受 decision/comment，不接受 approverUserId 或 approvedBy。审批人从新鲜交互会话解析；服务端校验独立审批、数据负责人策略和摘要一致性，返回 ApprovalRecord 后需重新读取 ReleaseRequest 获取新 ETag。

`POST /release-requests/{id}/deployments` 只接受已满足全部审批条件、未过期且当前有效的申请；无额外 body 可覆盖版本、环境、制品或权限。202 返回 Deployment。`GET /deployments/{id}` 查看部署，`GET /.../grants` 为授权管理员提供审阅，`POST /runtime-grants/{id}/revoke` 立即递增 epoch、撤销和取消执行。

`POST /apps/{id}/rollback-requests` 接受历史 targetDeploymentId/reason，创建 kind=rollback 的新申请；沿用同一审批与部署路径，不提供直接激活历史 deployment 的 API。

### 5.7 平台托管记录

生产记录路径 `/runtime/apps/{appId}/collections/{collectionKey}/records`，测试路径 `/apps/{appId}/preview/{appVersionId}/collections/{collectionKey}/records`。两组提供 GET 列表、POST 创建、PATCH `/{recordId}` 更新、DELETE `/{recordId}` 软删。创建者/ownerUserId、environment、schemaVersionId 均由服务端填写，WriteAppRecord 只接受 data。

运行端按活动部署的 collection schema、allowedActions 与当前访问者行策略执行；开发者只能访问测试环境。owner 行策略在服务端带入 owner_user_id 过滤，不接受请求指定 owner；organization 策略允许受众按审批动作访问组织内该应用集合。每记录 JSON 上限32KiB、schema 深度≤8、字段≤100；禁止把它作为任意二进制、秘密或动态代码存储。PATCH 采用整体 data 替换语义，必须携带 If-Match；禁止更新系统列。

## 6. HTTP 状态与错误码映射

| HTTP | code | 使用场景 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | schema、cursor、类型、未知字段不合法 |
| 401 | UNAUTHENTICATED | token 缺失/过期/无效 |
| 403 | FORBIDDEN / SELF_APPROVAL_FORBIDDEN / ENVIRONMENT_FORBIDDEN / GRANT_REVOKED | 当前动作、身份或运行权限被拒绝 |
| 404 | NOT_FOUND | 资源不存在或不可见 |
| 409 | STATE_CONFLICT / IDEMPOTENCY_CONFLICT / MAPPING_CHANGED | 状态竞争、相同键不同请求、映射发生变更 |
| 412 / 428 | REVISION_MISMATCH / PRECONDITION_REQUIRED | ETag 过期 / 缺少 If-Match |
| 413 | VALIDATION_ERROR | 上传或记录超过字节上限 |
| 422 | APPROVAL_REQUIRED / SCHEMA_MISMATCH / QUERY_REJECTED / QUERY_LIMIT_EXCEEDED | 缺少审批、语义不兼容、查询不允许或成本超限 |
| 429 | RATE_LIMITED | 用户/组织/源限流，带 Retry-After |
| 500 | INTERNAL_ERROR | 脱敏内部错误，返回 requestId |
| 503 | DEPENDENCY_UNAVAILABLE / STAGE00_EXECUTION_DISABLED | 依赖不可用 / 当前骨架禁用业务 |

后续实现应逐操作收窄实际错误集合，保留上述公共错误类型。阶段 00 只对已实现健康检查执行行为测试，其余错误码是未来实现契约。不能因为 OpenAPI 列出403就宣称已经实现权限控制。
> 阶段04/05增加/实现19个Studio操作，OpenAPI总111操作；以x-implementation=stage04为当前实现。详细Schema与请求响应仍由packages/api-contract/openapi.json唯一维护。所有写操作要求Idempotency-Key，未知字段拒绝；幂等重放前重新验证成员和语义权限，查询结果Cache-Control:no-store。源码/报表版本在组织事务锁内分配序号，不需要客户端revision覆盖历史。当前列表为最多100条的有界结果，nextCursor固定null；超过100条的真实游标分页为已知限制，不能把它当作全量导出。

| 路径 | 已实现行为 |
| --- | --- |
| GET /studio/capabilities、/studio/release-status | 固定编译能力与明确disabled发布状态 |
| GET/POST /apps，GET /apps/{appId} | 当前成员应用、REPORT/SITE创建 |
| GET/POST /apps/{appId}/versions，GET /apps/{appId}/versions/{appVersionId} | 源码文件上传、版本历史/详情，当前语义权限重查 |
| POST /apps/{appId}/restore | 恢复历史源码为新版本 |
| POST /app-versions/{appVersionId}/builds，GET /build-jobs/{buildJobId} | 实际独立编译任务/安全日志 |
| GET /apps/{appId}/preview/{appVersionId} | 鉴权获取独立iframe使用的HTML，不含Token |
| POST /apps/{appId}/preview/{appVersionId}/queries | queryKey+附加filters/timeRange，服务器固定TEST |
| GET/POST /reports，GET /reports/{reportId} | 报表语义资源 |
| GET/POST /reports/{reportId}/versions，POST /reports/{reportId}/restore | Schema/权限/语义校验，保存与恢复定义版本 |

常见新增错误包括REPORT_SCHEMA_INVALID、INVALID_QUERY_BINDING、INVALID_CHART_BINDING、REPORT_BINDING_MISMATCH、REPORT_VERSION_REQUIRED、SOURCE_PATH_REJECTED、SOURCE_LIMIT_EXCEEDED、SOURCE_IMPORT_REJECTED、SOURCE_SYNTAX_INVALID、BUILD_WORKER_NOT_CONFIGURED、BUILD_WORKER_UNAVAILABLE、BUILD_LEASE_EXPIRED。它们不会携带原始源码、连接串或编译器宿主路径。POST /release-requests仍未注册，插件返回未启用能力而不构造假审批对象。



## 站点分享与个人令牌（实际实现）

OpenAPI现118 operations。GET/POST /apps/{appId}/sharing、GET /site-shares/{shareId}、POST /site-shares/{shareId}/queries；命名对应SiteSharing/UpdateSiteSharing/SharedSite。POST分享需expectedRevision，更新返回SiteSharing，查询202 QueryJob。GET/POST /me/tokens和POST /me/tokens/{tokenId}/revoke；PersonalToken/CreatePersonalToken/CreatedPersonalToken，与库同名实体映射。所有接口需Bearer和组织header；变更需Idempotency-Key。个人令牌签发不回放明文，重复key409 TOKEN_ALREADY_ISSUED，限额429 TOKEN_LIMIT_REACHED；撤销幂等。令牌列表仅最新100且nextCursor=null。请求无调用者ID/管理员标识/生产环境字段。详见site-sharing-and-tokens.md。


## 正常账号登录增量

累计127 operations，新增9个password-accounts接口，登录/注册/会话/退出/改密和注册邀请管理。请求/响应见PasswordLogin、PasswordRegistration、PasswordChange、BrowserSession、RegistrationInvitation等同源Schema。所有POST要求Idempotency-Key；Cookie操作要求Origin与CSRF。登录、邀请码等秘密响应不写通用缓存。详细幂等/错误码和身份规则见accounts-guide.md；没有公共管理员注册接口。

## 服务器工作区与直接配置连接（已实现）

OpenAPI新增8个服务器workspace接口、POST /network-endpoints、POST /physical-connections/configure，共137操作。对应ServerWorkspace/WriteServerWorkspace/EditServerWorkspace/ServerWorkspaceCommit及ConfigurePhysicalConnection；请求/响应以唯一契约为准。源码路径只标识项目文件，不是服务器系统路径。直接连接配置需要人类network.manage和connection.manage；密码为writeOnly。操作、幂等、revision和错误语义见[说明](server-workspaces.md)。
> 2026-10-24新增5个远程调试接口和StudioDebug契约，当前共149个操作。接口、身份边界、幂等和截图返回见[远程调试说明](remote-debugging.md)，唯一源文件仍为packages/api-contract/openapi.json。

