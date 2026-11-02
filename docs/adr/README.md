# 架构决策记录

状态为 Accepted 的决策构成阶段00基线；变更以新增 ADR 替代旧记录并保留引用。实现与设计状态分开记录，Accepted 不代表功能已启用。

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [0001](0001-modular-monolith.md) | 模块化单体与独立执行边界 | Accepted |
| [0002](0002-data-access.md) | 逻辑源映射、声明式查询与双环境隔离 | Accepted |
| [0003](0003-release-snapshots.md) | 不可变审批快照与受限生产授权 | Accepted |
| [0004](0004-contracts-and-monorepo.md) | Monorepo、契约同源与工具链 | Accepted |
| [0005](0005-harness-adapter.md) | Harness 作为可替换客户端 | Accepted |
| [0006](0006-managed-app-data.md) | 静态轻应用与平台托管记录 | Accepted |

| [0007](0007-catalog-connectors.md) | 数据目录控制面与独立多库适配器 | Accepted / 阶段02实现 |
| [0008](0008-catalog-jobs-and-versions.md) | 持久任务、不可变语义与演示身份边界 | Accepted / 阶段02实现 |

| [0009](0009-secure-query-gateway.md) | 统一安全查询网关、行策略与受限执行 | Accepted / 阶段03实现 |
| [0010](0010-production-query-consumer.md) | 生产查询只读消费批准事实 | Accepted / 阶段03实现 |
| [0011](0011-source-first-reports.md) | Harness生成源码、固定编译和测试预览 | Accepted / 阶段04实现 |
| [0012](0012-harness-version-and-portal.md) | 实际宿主版本与官方工具/门户集成 | Accepted / 阶段05实现，待用户宿主测试 |

| [0013](0013-site-sharing.md) | 组织内TEST分享与访问者数据权限 | Accepted |
| [0014](0014-personal-tokens-and-upload.md) | 一次性个人令牌与人工源码上传 | Accepted |

| [0015](0015-password-accounts.md) | Cookie网页登录、邀请注册与离线管理员 | Accepted |

| [0016](0016-server-workspaces-and-skill.md) | 默认服务器文件编辑、版本提交与内置Harness Skill | Accepted |
| [0017](0017-direct-connection-setup.md) | 单表单连接配置与服务端加密凭据 | Accepted |
| [0018](0018-actionable-diagnostics-and-preview-queue.md) | 可操作错误、历史预览诊断与查询排队 | Accepted |
| [0019](0019-requested-query-rows.md) | TEST查询按请求行数执行、取消累计分页终点 | Accepted |
| [0020](0020-query-admission-and-scheduling.md) | 查询接收与执行调度分开、忙碌自动排队 | Accepted |
| [0021](0021-reviewed-static-production-releases.md) | 冻结审批、受控静态部署与原子授权激活 | Accepted |
