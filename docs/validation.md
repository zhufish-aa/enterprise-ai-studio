# 阶段 00 验证记录

验证日期：2026-10-22（Asia/Taipei）

## 执行环境与结果

本地 Windows PowerShell；Node.js v24.15.0、npm 11.12.1、pnpm 10.12.1。依赖精确锁定于 pnpm-lock.yaml。以下结果来自实际执行，不代表计划中的业务能力已经启用。

| 检查 | 结果 | 范围 |
| --- | --- | --- |
| pnpm install --frozen-lockfile | 通过 | 9个 workspace 项目（根 + 8包）；锁文件无需更新 |
| contract:check | 通过 | OpenAPI 3.1.1、75个操作、86个schema、生成类型一致 |
| boundaries:check | 通过 | 8包依赖方向与跨包源码导入约束 |
| deliverables:check | 通过 | 必要文档、6份ADR、7项关键流程、表/接口计数和开发YAML静态校验 |
| typecheck | 通过 | 8包TypeScript strict检查；自动构建基础包 |
| build | 通过 | Nest API、两个Vite界面、共享包、契约、Cordis插件、两个worker |
| schema:check | 通过 | PGlite实际执行43张表及其约束/索引 |
| test | 通过 | 3项行为测试；0失败 |
| 本机HTTP启动检查 | 通过 | API开发入口、platform-web、report-runtime均实际启动并返回200；检查后进程已退出 |

## 已验证的拒绝行为

参考数据库拒绝：跨组织应用成员关联、test映射指向production物理连接、缺少运行grant的production查询、自审、伪造申请人和同一审批人重复审批。批准记录的合法对照样本能够写入。该测试只证明指定数据库约束，不证明完整业务审批已经实现。

骨架API的healthz返回200，readyz返回503与STAGE00_EXECUTION_DISABLED，未实现生产业务路径返回404。两个worker显式禁用执行；真实Cordis Context能够挂载和卸载插件提供的能力服务。

## 未执行的环境验收

当前机器没有Docker命令，未运行Compose启动、Dockerfile构建、容器网络或沙箱测试。PGlite不能代替真实PostgreSQL 18上的RLS、角色、锁竞争、连接池和恢复测试。

完整Harness宿主加载、企业OIDC/Vault、数据源实际连接、生产审批状态机、运行授权、发布代理、回滚、报表实时查询、托管CRUD和专用Linux隔离均未实现或尚未接入环境。它们分别归入development-plan.md的后续阶段，不属于本次已验证能力。
