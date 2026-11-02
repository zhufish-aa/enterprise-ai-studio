# ADR0009：统一安全查询网关与数据库执行

状态：Accepted / 阶段03实现。承接ADR0002/0007/0008。

## 决策

所有业务读取迁入/queries/test与/runtime入口，共享QuerySpec JSON Schema和当前权限引擎。旧/datasets/{id}/preview返回410，旧目录预览任务不得领取或读取；避免新策略旁路。QUERY DSL只表达语义key和有限操作符，组织/部门/用户过滤由服务端注入，敏感字段SQL侧脱敏；无自由SQL/函数/host能力。

QueryGateway通过CatalogQueryPort取模型和连接能力，通过Identity端口读当前数据范围与明确grant，通过RuntimeQueryAccess端口消费发布事实，模块不导入其他模块私有模型实现。查询事实使用原query_jobs，放开TEST app_version_id必填限制，生产仍强制版本/部署/runtime_grant。新增不可变query_policies、head和query_audits，50表迁移结构为当前权威。

PostgreSQL使用同一只读事务的GUC上下文、可选强制RLS校验、EXPLAIN成本门、参数化SQL、受限池和backend取消。MySQL/SQLServer提供受限方言编译，但网关执行未真实验证，先拒绝GATEWAY_ENGINE_UNVERIFIED。迁入新引擎还需等价成本门、会话隔离/取消及真实权限测试。

## 取舍

没有共享结果缓存，选择当前权限重检和五分钟发起人私有结果。分页游标绑定授权，不提供跨页数据快照一致性。策略需要管理员显式配置，新语义版本不会自动继承，降低易用性以避免隐式放权。组织锁使授权变更与任务领取/结果提交有清晰顺序，但首版写并发和目录查询效率仍需后续优化。
