# 阶段03验证记录与未覆盖风险

日期：2026-10-23（Asia/Taipei）。Windows x64；Node24.15.0、pnpm10.12.1、原生PostgreSQL18.4。实际工作为QueryGateway、JSON Schema DSL、参数化方言编译器、行/字段/部门/脱敏/导出权限、环境路由、query_jobs与审计、独立connector和管理台预览集成。最终命令结果见交付记录。

## 真实边界证据

集成测试启动SCRAM PostgreSQL原生集群，元库使用非super/BYPASSRLS角色，来源库另用最小SELECT账号；实际HTTP用户token来自元库会话hash，worker在独立Node子进程。secure_orders实际存四行：本组织east120/80、west900、另一组织east9999，并启用FORCE RLS。TEST完整链路只返回east两行及SQL侧***test邮箱，指标按时间区间正确返回120。原文邮箱在源库存在，但受限job/API结果中不存在。

| 用户要求 | 自动化证据与断言 |
| --- | --- |
| 1 SQL注入 | 恶意部门字符串经实际参数绑定返回0行，原表仍4行；字段名和排序注入被拒绝且query_jobs数量不增加 |
| 2 未授权字段 | 缩小真实资源grant后，amount与依赖amount的指标均在创建任务前被拒绝 |
| 3 跨部门数据 | east请求west条件仍0行；west成员仅得到900；RLS原始只读账号查询也仅见当前east行 |
| 4 非法数据库函数 | pg_sleep/pg_read_file表达式和functions未知属性被Schema/语义拒绝，未产生执行任务 |
| 5 TEST伪造PROD | 根/DSL environment属性拒绝；不存在客户端环境切换路径，未生成生产job |
| 6 未审批报表 | 真正元库report/report_version无批准部署时拒绝；完整审批元数据替身另测所有生产门 |
| 7 撤权 | 旧结果、同幂等键重放拒绝；部门变更还终止实际在途查询并使结果失效 |
| 8 超时/超大 | approved slow视图在实际pg_sleep时超时，pg_stat_activity检查停止；过大limit在执行前拒绝，大结果只返上限并标记truncated，过大单元/累计字节拒绝无部分结果 |
| 9 无效datasetId | 非UUID400、未知UUID404，query_jobs数量不增加 |
| 10 跨用户缓存泄漏 | 当前用户私有job另一成员404；同一DSL不同用户分别得到east/west数据，签名分页cursor跨用户403；无共享结果缓存 |
| 11 参数类型 | limit字符串、metrics字符串、数字过滤使用SQL字符串、错误timeRange字段类型均拒绝无job |
| 12 DB中断 | 真实pg_terminate_backend打断来源查询，安全CONNECTION_LOST且无结果；下一次正常查询成功 |

补充：实际EXPLAIN拒绝成本、强制RLS被关闭时拒绝、独立导出授权/撤销/截断/CSV公式转义、并发第三请求429、用户取消使pg_stat_activity对应活动SQL消失、显式unmask要求当前角色+字段grant、审计拒绝UPDATE且无过滤值/口令/结果、三种方言占位符顺序/白名单编译、旧preview410和旧任务拒绝。

## 生产授权证据的范围

初始未审批app/report在选择生产连接前失败。另用受信测试fixture在元库构造版本、成功构建、sealed制品、scope、受众、两名独立审批人、canonical快照、deployment_slot与runtime_grant，验证完整事实可进入执行任务、但缺少PROD worker时失败关闭；随后改变批准状态、审批人成员状态、用户权限有效期、快照、字段scope和runtime_grant，均拒绝且不产生新任务。

这些审批/制品/映射是明确元数据替身，没有真实构建证明、发布系统、生产源或mTLS/Vault成功执行。不能报告为真实生产链验收。与PostgreSQL TEST链路成功证据分开保存。

## 浏览器集成

实际管理台以业务成员token登录，测试预览明确提示统一网关。选择销售区域、已支付销售额和订单数，页面返回华东12800/华南8600各1笔；数据来自真实测试DB，接口为/queries/test及/query-jobs，旧preview关闭。页面控制台error/warn为空，截图为outputs/stage03/gateway-browser-preview.jpg。浏览器核验为实际操作记录，不混入自动用例数量。

## 无法覆盖和仍需企业验收的风险

- MySQL/SQLServer仅验证编译方言，网关实际执行明确关闭；阶段02适配器也仍未真实实例验证。
- 企业OIDC/MFA/JWKS、Vault ACL/轮换、真实mTLS/证书吊销、主机防火墙与TEST/PROD网络隔离、容器运行/备份恢复未端到端验收。
- 发布/审批/runtime_grant生产者、构建证明和真实PROD链仍未实现完整业务。查询consumer不能代替发布事务或审批UI。
- EXPLAIN成本是估计；复杂DBA视图、统计失真和数据库服务压力仍需数据库侧资源配额/监控。并发与语义limit不构成操作系统硬隔离。
- GUC型RLS依赖受信connector设置真实上下文，不能抵御API/worker/Vault/DBA被攻陷。账户所属角色和额外数据库权限仍需运维最小权限审计。
- 五分钟私有job持久化可能含用户过滤值及明确授权的未脱敏业务数据；数据库存储、备份、磁盘加密/保留策略需企业落实。审计表本身不保存这些值。
- 多页为独立事务，业务数据变更期间不提供快照一致性；敏感聚合还可能产生统计推断，需后续最小分组/额外隐私机制。
- 单一受信签名密钥/CA轮换、集群大规模调度与限流压力未演练；网关资源上限已实际测试，不代表所有容量配置经过压测。

## 最终检查结果

pnpm install --frozen-lockfile退出码0，锁文件无需更新。pnpm check退出码0：104操作契约/生成类型、10包依赖边界、10个ADR、50表迁移交付、strict类型与全部构建、基线DDL约束、50项自动测试均通过，0失败、0跳过。网关集成文件含19个子场景，另有5项方言/编译边界检查，Node总计数包含集成父场景。检查日志和真实数据库摘要随outputs/stage03交付。
