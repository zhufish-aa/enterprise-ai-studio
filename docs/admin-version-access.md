# 管理员版本查看与演示授权修复（2026-10-26）

本次用户截图中的 GET /apps/468e674f-c4b0-43b0-be04-1660be4c7f7d/versions 返回 404。只读数据库排查确认：应用“销售经营看板”存在，admin 账号为 active、当前组织成员为 active、应用角色为 maintainer，角色动作包含 app.view、catalog.manage 和 dataset.query.test。

真正触发拒绝的是 ERP 销售分析数据集的初始化授权：dataset.read 到期于 2026-10-24T11:09:04.627Z，dataset.query.test 到期于 2026-10-24T11:09:04.635Z。两条都是创建时仅配置一天有效期。旧版版本接口逐一调用完整查询授权校验，将数据查询授权过期转换成通用 NOT_FOUND，导致应用卡片可见、版本历史无法加载。

## 本次改动

- 版本列表、单个版本详情和报表历史使用独立的元数据检查。当前应用成员身份与 dataset.read 的字段、指标范围仍实时生效；catalog.manage 按现有目录规则可检查结构。查看版本不再要求 TEST 查询授权、实时查询策略或可连接的 TEST 数据库。
- 构建、预览取数、源码提交、草稿恢复（包括幂等重放）和发布继续使用原查询授权校验。查看元数据不会为账号签发数据查询权限。
- 缺少资源授权返回 RESOURCE_GRANT_REQUIRED；当前账号的已有授权过期返回 RESOURCE_GRANT_EXPIRED，附 resourceId、permission、expiresAt 和请求/追踪编号。不会查询其他用户的授权或通过错误暴露其他组织的资源。
- 版本包含当前账号读取范围之外的字段或指标时返回 VERSION_METADATA_ACCESS_DENIED，明确 queryKey 和 datasetId。
- 门户不再静默吞掉预览接口的所有 404；预览失败会显示实际原因。
- 当前本地演示仅修复 admin 在该数据集上的两条原有 TEST 相关授权，使用 9999-12-31 作为长期有效标记。字段、指标、部门范围、源码版本与 PROD 授权保持原样；没有恢复已删除的授权。操作与原到期时间记入 audit_logs，action 为 local_fixture.test_access.repair。
- 新建交互式本地演示时，sales-fixture 的 persistentTestAccess 选项只延长本次初始化刚签发的 TEST 授权。集成测试 fixture 默认仍是短期授权。服务重启不会自动重建或延长被撤销的授权。该选项不用于真实生产环境，也不改变管理员在门户创建授权的接口。

## 交付与验证范围

已编译 API、SDK 与 Web；使用现有数据库修复授权并更新本地服务。修复记录为 outputs/admin-version-access-20261026/repair.json。

已补充 tests/version-metadata.integration.test.mjs，覆盖管理员元数据查看与执行分离、读取字段限制、过期详情、恢复请求幂等重放仍拒绝以及不创建查询任务。**依用户要求，没有执行这些测试、浏览器验证或 Harness 验证；编译与服务就绪不等于业务验收通过。** 用户刷新门户后验证版本、构建和预览操作。
