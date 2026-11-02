# ADR0010：生产查询只读消费发布事实

状态：Accepted / 阶段03实现；完整发布生产者待后续阶段。

## 决策

生产请求根据固定runtime路径解析当前deployment_slot，不能由environment参数选择。读取批准且有效的release、sealed构建制品、不可变版本/报表queryKey、受众、两名独立当前有效审批人、scope摘要、active未过期runtime_grant和当前epoch，再交集当前访问者的app/report/dataset/字段/指标/导出权限。创建者或管理员身份不代替访问者授权。

review_policy_snapshot.gateway v1明确绑定scope、reports与audience三个摘要；消费端要求snapshot_digest匹配全部快照。映射head、策略head、权限和部门变化导致旧计划/结果失效。权限更新必须通过当前服务端事务，不接受客户端审批人或approved标记。

本阶段API账号只读审批、制品、部署事实，不能签发生产授权；runtime_grants仅为失效需要UPDATE，没有INSERT。没有有效事实时生产请求在业务连接前失败；完整事实但PROD worker未配置时任务失败DEPENDENCY_UNAVAILABLE。测试中的审批/映射/部署是明确标注的元数据替身，不是真实生产数据库或发布流程验收。

## 后续门槛

发布模块实现规范化快照生成、批准事务、构建证明验证、制品发布和slot切换后，补齐真实PROD mTLS/Vault/数据库与故障恢复验收。DBA/元数据库特权账号、被攻陷API/connector或伪造企业身份属于受信计算基被破坏，不能靠此消费者数据库行本身抵御，必须有外围审计、秘密隔离和主机策略。
