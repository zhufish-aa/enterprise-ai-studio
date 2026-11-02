# 阶段03：安全数据查询网关

本阶段实际实现统一DSL、编译器、资源/行/部门/字段权限、脱敏、导出、TEST/PROD路由、持久查询任务、取消、成本控制和脱敏审计。管理台预览调用相同网关。查询引擎目前真实验证PostgreSQL18.4；MySQL/SQLServer具备编译方言和阶段02驱动，网关执行保持GATEWAY_ENGINE_UNVERIFIED拒绝，不能把编译器单测当成真实数据库兼容证明。

## 调用契约

OpenAPI源为packages/api-contract/openapi.json，QuerySpec为DSL Schema（JSON Schema，Ajv校验、不类型转换、不移除未知字段）。所有请求含Bearer和X-Organization-Id，写/校验请求附UUID Idempotency-Key。客户端不能提供actor、角色、环境、host、凭据、SQL、表名表达式或函数。datasetId稳定，TEST可指定datasetVersionId或由服务端解析最新版本，运行报表由批准版本绑定。

~~~json
{
  "query": {
    "datasetId": "00000000-0000-4000-8000-000000000001",
    "datasetVersionId": "00000000-0000-4000-8000-000000000002",
    "metrics": ["paid_total"],
    "dimensions": ["department_key"],
    "filters": [{"fieldKey":"status","operator":"eq","value":"paid"}],
    "groupBy": ["department_key"],
    "orderBy": [{"key":"paid_total","direction":"desc"}],
    "limit": 20,
    "pagination": {"pageSize":20},
    "timeRange": {"fieldKey":"occurred_at","from":"2026-10-01T00:00:00Z","to":"2026-11-01T00:00:00Z"}
  }
}
~~~

metrics/dimensions/filters/groupBy/orderBy必须显式给出，可为空数组，但不能同时没有字段和指标。指标引用注册的聚合定义（sum/avg/count/countDistinct/min/max），不能请求数据库函数。聚合模式groupBy必须与dimensions集合一致且都是允许维度；明细模式groupBy为空。orderBy只引用本次授权输出字段/指标，方向为asc/desc。filters的in最多100项、between恰好两项；数字、布尔、日期值按字段类型校验，禁止将数字字符串隐式当数字。timeRange使用半开区间[from,to)。

TEST 查询与导出不设置预设返回行数上限。提供 limit 时按请求行数执行；省略 limit 且不分页时不生成 SQL LIMIT。分页可只给 pagination.pageSize，同时给 limit 时两者须一致；nextCursor 可继续读取超过 10,000 行。QueryPolicy 的 maxRows/maxExportRows 为兼容旧数据保留的可选废弃字段，不再限制 TEST 查询或源码版本提交。校验响应 maxRows 为本次请求行数，未指定则为 null。生产查询仍使用已批准 release scope 的行数范围。

明细分页必须包含授权且未脱敏的语义主键，聚合按全部分组维度确定顺序。nextCursor签名并绑定当前用户、组织、查询、版本、授权、部门、策略、映射和用途，五分钟有效，不设累计行数终点。不同用户/策略不得复用。分页每页是独立只读事务，不保证并发业务数据变化时的跨页快照一致性；需要财务一致导出时应使用后续快照导出能力。确定排序是分页必要条件，参见[PostgreSQL SELECT文档](https://www.postgresql.org/docs/18/sql-select.html)。

## 已实现接口（前缀/v1）

| 入口 | 用途与权限 |
| --- | --- |
| POST /queries/test | 开发查询，dataset.read + dataset.query.test及各自资源授权 |
| POST /queries/test/validate | 当前DSL、语义、授权、行范围与静态资源检查，不执行远程SQL |
| POST /queries/test/exports | TEST导出，另需dataset.export角色动作及资源授权 |
| POST /runtime/apps/{appId}/queries | 已发布应用查询，当前app.view + dataset.query.production及资源授权 |
| POST /runtime/apps/{appId}/queries/validate | 同一生产授权门检查 |
| POST /runtime/apps/{appId}/exports | 同一生产门，另需导出权限 |
| POST /runtime/reports/{reportId}/queries | 批准报表queryKey绑定，只接受追加filters |
| POST /runtime/reports/{reportId}/queries/validate | 同一报表版本/受众/授权检查 |
| POST /runtime/reports/{reportId}/exports | 批准报表导出，另需导出权限 |
| GET /query-jobs/{queryJobId} | 仅发起人读取，实时重新检查全部授权；导出任务不返回行值 |
| POST /query-jobs/{queryJobId}/cancel | 当前成员只能取消本人任务，不能借此读取结果 |
| GET /query-jobs/{queryJobId}/export | 成功导出任务的当前授权发起人下载CSV |
| POST /queries/diagnostics/validate | 人类query.diagnose权限；仍需相同数据授权，不存在管理员SQL旁路 |
| POST /datasets/{datasetId}/query-policies | 人类query.policy.manage创建不可变策略版本，切换head并失效旧授权 |
| GET /datasets/{datasetId}/query-policies | 管理员查看策略版本，最新在前 |
| POST /organizations/{orgId}/members/{userId}/data-scope | 人类permission.manage维护当前部门范围 |
| GET /query-audits | 人类query.audit.read读取最近100条安全审计事件 |

查询/导出创建202，返回QueryJob：id、datasetId、environment、purpose、status、expiresAt、traceId、durationMs、rowCount、truncated、安全failureCode及result。成功查询result含columns(key/dataType/masked)、rows、truncated、nextCursor。任务结果最多保存五分钟；所有查询响应Cache-Control:no-store。无共享查询结果缓存，不能用模板/创建者身份共享结果。

校验返回valid=true仅表示当时的模型与权限检查通过；实际连接、数据库RLS和EXPLAIN成本仍可能在执行时失败。错误统一error.code/message/requestId与traceId：400未知字段/类型/游标，401身份，403生产门或策略变更，404资源不可见，410旧预览入口停用，422字段/指标/成本/上限拒绝，429并发容量，503依赖不可用。异步失败见QUERY_TIMEOUT、QUERY_COST_REJECTED、CONNECTION_LOST、DATABASE_RLS_REQUIRED等安全码，202不代表成功。

## 权限与策略

1. 数据平面没有catalog.manage管理员绕过。读取与TEST/PROD查询需要角色动作和未过期的明确资源授权交集。字段与指标空数组代表无权限。指标的聚合字段及口径过滤字段也必须有权。
2. 没有query_policy_head则拒绝。策略绑定不可变数据集版本，组织字段绑定服务端组织ID；departmentFieldKey绑定当前成员department_codes，空部门范围拒绝；userFieldKey可绑定当前访问用户。独立组织数据源必须由管理员明确dedicatedSource=true，不隐式省略组织边界。
3. fixedFilters与组织/部门/用户限制始终AND用户条件，不能被客户端覆盖。策略字段可用于内部行过滤，但不会因此成为用户可选字段。
4. masks支持redact(NULL)和last4，在SQL SELECT中执行。受保护字段不能用于用户过滤、分组、排序或指标输入以减小推断风险。只有当前dataset.unmask角色动作与覆盖字段的资源授权同时有效，才允许原值。catalog.manage或创建者身份都不能代替它。
5. 导出再交集dataset.export字段/指标范围，按同一行策略和脱敏执行。CSV以UTF-8 BOM输出，公式起始字符加文本前缀，正确转义引号；QueryJob.truncated和下载X-Result-Truncated说明是否截断。下载重新鉴权，不能用已撤销grant取旧文件。
6. requireDatabaseRls=true时PostgreSQL连接实际检查表ENABLE+FORCE RLS、非owner、非super/bypass角色；事务设置受信eas.organization_id/user_id/department_codes。缺失RLS失败，不静默降级。视图无法仅由表面属性证明底层RLS，因此该强制开关首版面向表；视图需DBA评估security_invoker/底层权限。数据库RLS语义见[PostgreSQL官方文档](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)。

策略示例（POST /datasets/{datasetId}/query-policies）：

~~~json
{
 "datasetVersionId":"00000000-0000-4000-8000-000000000002",
 "organizationFieldKey":"organization_key","dedicatedSource":false,
 "departmentFieldKey":"department_key","userFieldKey":null,"fixedFilters":[],
 "masks":[{"fieldKey":"email","mode":"last4"}],"requireDatabaseRls":true,
 "timeoutMs":3000,
 "maxCost":100000,"maxScanRows":1000000,"slowQueryMs":500
}
~~~

管理配置通过上述实际API完成，本阶段未新增完整的策略编辑UI。原管理台测试预览已接入网关；关闭预览时对已知任务发取消请求，新语义版本必须另建安全策略。不能沿用旧版本的隐式策略。

## 生产门与发布模块边界

生产路由不接受environment参数，而从活动deployment_slot读取应用/报表的已批准版本。检查release_request=approved且未过期，成功构建与sealed制品摘要一致，当前受众、app.view/report.view、数据集生产授权、批准字段指标、当前policy epoch、runtime_grant=active未过期、映射head与批准映射一致。报表只能使用app_version_reports绑定的report_version与queryKey，不能临时换dataset或指标。

审批快照consumer格式为review_policy_snapshot.gateway（schemaVersion=1，appVersionId、artifactDigest、scopeDigest、reportsDigest、audienceDigest、requiredApproverUserIds）；snapshot_digest是完整review_policy_snapshot的canonical摘要。至少两名不同于申请人的审批人必须当前仍为active成员且具备release.approve，并有匹配摘要的approve记录；任何reject拒绝。scopeDigest绑定按dataset_version_id排序的release_scopes全行，reportsDigest绑定按report版本/queryKey排序的配置摘要和查询定义，audienceDigest绑定按user_id排序的受众。定义精确实现见releases/query-access.ts。

此阶段实现只读消费和拒绝逻辑，没有提供审批、签发runtime_grant、部署或切slot的公开接口。未来发布生产者必须按同一快照契约以受信事务产生这些事实，不能由浏览器/AI提交approved=true。测试构造的审批/部署行是显式元数据替身：已验证缺失/撤销/篡改时拒绝、完整事实进入缺少PROD connector的失败关闭分支；没有真实生产数据库成功执行证据。

## 执行与资源控制

查询事务仅在元数据库做授权/持久化，不等待业务DB。query_jobs保存当前授权摘要、连接/映射、版本、策略、epoch、发起人、Trace ID和短租约。独立worker只接受签名任务ID，经环境专用mTLS领取计划，不能接收业务用户SQL/主机。领取、周期监控、完成和结果读取都复核当前权限；取消/撤权/过期结果不覆盖终态。

查询接收不再设每用户/组织在途数量上限。合法请求先入持久队列，由调度器按实际运行位置逐步领取：组织4个运行、每用户2个、单worker4个（与目录任务共享执行并发）。等待不计入运行位置；位置不足、worker忙碌或连接池忙碌时保持/恢复queued，不返回业务429，也不消耗失败尝试次数。worker的网关池最多16个指纹，每池不超过2个数据连接，额外1个取消连接；闲置60秒在下一次任务清理，凭据轮换关闭旧闲置池。多连接/环境仍需数据库侧总连接配额。租约30秒、最多3个attempt，任务/结果五分钟。SQL超时100..10000ms且受物理连接更小上限限制；参数总预算500，输出最多40列，SQL投影将单元控制在32KiB并以隐藏标志拒绝超长值；驱动使用无自动累积的逐行读取，累计2MiB即取消，最终结果1MiB，TEST返回/导出按请求行数执行，生产受批准scope范围约束。

PostgreSQL在同一READ ONLY事务设置statement_timeout/lock_timeout、RLS上下文，先EXPLAIN FORMAT JSON（不ANALYZE）检查每层Total Cost与Plan Rows上限，再执行参数化SELECT。成本为规划器估计，不等于实际扫描量证明；数据库统计、视图、函数与负载仍可能使估计偏差，须结合超时、并发和账号限制。取消通过同一只读身份的pg_cancel_backend定位当前backend，等取消完成再释放会话，防止复用PID期间误取消另一用户；失败用关闭连接与SQL超时兜底。真实测试检查活动查询消失。

## 审计与运行注意

query_audits追加记录user/app/report/dataset/job/环境、duration/rowCount/status/permissionResult/Trace ID/slow，不包含SQL、过滤值、结果、口令或连接串。提交、完成、取消和拒绝分别追加；数据库触发器拒绝审计更新删除。query_jobs私有query_spec仍含调用者过滤值，结果可能含明确授权的未脱敏数据，必须按业务数据保护其存储、备份和五分钟留存；不能把任务表当成无敏感数据日志。

元数据库不可用时失败关闭；来源DB中断返回安全码，池可恢复。所有安全能力仅在本机真实PostgreSQL、实际HTTP身份与独立worker进程验证，不代替企业OIDC/MFA、Vault ACL、mTLS、跨主机网络、实际MySQL/SQLServer、备份恢复和部署生产者验收。见stage03-validation.md。

## 最小HTTP调用示例

使用本机开发身份或企业实际访问者的access token。先从授权目录获取真实datasetId/versionId，再按上方JSON写入query.json（不可把密码或SQL写入该文件）。

~~~powershell
$gatewayHeaders = @{ Authorization = "Bearer $env:EAS_ACCESS_TOKEN"; "X-Organization-Id" = $env:EAS_ORGANIZATION_ID; "Idempotency-Key" = [guid]::NewGuid().ToString() }
$gatewayJob = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5173/v1/queries/test" -Headers $gatewayHeaders -ContentType "application/json" -Body (Get-Content query.json -Raw)
Invoke-RestMethod -Uri ("http://127.0.0.1:5173/v1/query-jobs/" + $gatewayJob.id) -Headers $gatewayHeaders
~~~

企业调用替换为固定受信HTTPS平台入口，环境由路径与服务端事实决定，不增加environment参数。异步任务需轮询至succeeded/failed/cancelled；HTTP202只代表已接受。导出使用/queries/test/exports创建，再在成功后GET /query-jobs/{id}/export，检查X-Result-Truncated。
