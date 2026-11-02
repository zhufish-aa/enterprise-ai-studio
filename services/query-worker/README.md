# 数据源与安全查询connector

未设置CATALOG_WORKER_ENV时保持关闭capability并退出。显式test/production后启动独立连接服务：/execute处理健康与定向元数据，/gateway/execute处理阶段03查询，/gateway/cancel取消当前任务。只接受签名组织/任务ID，经固定API领取短租约计划；旧目录preview禁止执行。没有任意SQL、源码执行、主机或凭据的业务参数。

生产模式强制HTTPS/mTLS、独立秘密和网络清单，拒绝fixture。生产业务计划必须通过API侧发布/审批/当前受众与用户/字段/runtime_grant检查，worker再次核对环境。审批签发和发布生产者未实现；元数据替身不能视为真实生产验收。Gateway当前仅允许真实验证的PostgreSQL，其他引擎失败关闭。环境配置见../../docs/catalog-guide.md，网关规则与成本/取消/RLS见../../docs/query-gateway.md。

业务查询按只读事务设置受信组织/用户/部门上下文，检查角色及所需RLS，再EXPLAIN、参数化SQL、SQL脱敏/单元大小门和流式总量限制；取消定位自己的数据库backend，失败会丢弃连接，不复用有错误的会话。仅通过签名结果回传，完成/结果读取仍由API复核当前授权。
