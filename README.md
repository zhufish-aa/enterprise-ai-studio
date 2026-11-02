# Enterprise AI Studio

企业内网AI应用与报表平台。当前交付包括源码/真实TEST预览、Harness插件，以及阶段06顺序审批、受控静态发布和回滚。数据源管理与安全查询网关继续可用。

**Harness生成完整React代码并通过插件直接编辑服务器项目文件，平台管理权限、草稿、源码版本、固定编译和TEST预览。平台没有新增模型生成服务。** 插件的真实宿主测试按用户要求由用户完成，未宣称已通过。

## 启动

~~~sh
pnpm install --frozen-lockfile
pnpm --filter @eas/preview-worker browser:install
pnpm check
pnpm dev:local
~~~

需要Node24与pnpm10.12.1。打开http://127.0.0.1:5173，使用work/initial-login.json中的admin或developer账号和随机临时密码登录；首次登录必须修改。网页不再要求填写访问令牌，登录后可以创建Harness客户端令牌。初始凭据不要提交、截图或打包。命令启动真实PG18.4、API、查询connector、独立固定编译worker与Vite；无需Docker，每次创建新的临时数据环境。

“销售经营分析”真实查询独立studio_sales_test：已支付60笔、47,040元；华东11,536元/15笔。日期范围固定为2026-09-24至2026-10-23以便结果可重复。图表没有预嵌销售数据，日期与区域过滤均经过安全网关。

## 实际功能

- 账号密码登录、后台配置邀请码/直接注册、邀请管理、离线管理员初始化、首次改密与会话恢复/撤销；详见[账号使用说明](docs/accounts-guide.md)。

- 管理员直接填写主机、端口、数据库、用户名和密码，新建连接、真实连接测试；后台登记端点并加密凭据。
- 服务器文件的创建、读取、精确编辑、重命名、删除、历史载入和不可变提交；网页与Harness共享草稿，默认无需本地上传。
- 服务器源码目录树、多级展开/折叠、文件搜索、键盘浏览、按语言代码高亮、行号与代码折叠、多文件修改保留和批量保存。
- AI远程浏览器调试：控制台/异常/查询日志、页面交互、DOM/样式检查、浏览器控制台求值、键鼠与尺寸调整、真实PNG图片附件；使用独立preview-worker，详见[远程调试](docs/remote-debugging.md)，本次按用户要求未执行浏览器或Harness验收。
- 网页与Harness的详细错误、字段说明、处理方法及追踪编号；历史版本也显示平台诊断面板，多图表排队取数；分享页全屏显示站点。
- 逻辑源、独立TEST/PROD映射、受限元数据、字段/指标语义、资源授权。
- 查询DSL/方言编译、实时数据集/字段/部门/行权限、脱敏、超时、成本/并发控制、按请求行数查询及连续分页、取消与审计。
- REPORT/SITE应用、当前成员鉴权、真实源码上传、不可变版本/哈希/文件差异及草稿恢复。
- 可选版本化报表Schema与查询快照，React/ECharts指标、表格、柱、线、饼、排名及筛选/空态/错误。
- 独立固定React编译，不执行上传项目的安装/构建脚本或任意Shell；opaque iframe预览，不向生成应用注入Token。
- Harness官方Cordis工具桥接、原生站点入口、会话TEST数据选择、工作区文件采集、服务器工作区工具、随包enterprise-sites Skill、类型安全SDK和门户入口；可选本地导入接受项目完整路径，取消固定root与插件额外确认。
- 个人访问令牌的一次性签发、限权、到期与撤销；私有/组织内链接公开的固定TEST版本分享，数据按访客当前授权查询。
- 冻结版本上线申请、顺序审批、受控部署、原子生产授权、正式运行和重新审批回滚；测试产物保留preview_only，生产要求独立部署凭证。

## 工程入口

| 路径 | 职责 |
| --- | --- |
| apps/platform-web | 数据管理与应用/版本/预览/报表编辑门户 |
| apps/platform-api | Nest/Fastify模块化控制平面 |
| apps/report-runtime | 独立声明式TEST报表运行入口 |
| packages/api-contract | 唯一OpenAPI、生成类型及报表Schema |
| packages/platform-sdk | 控制面Client与无Token的iframe runtime SDK |
| packages/report-ui | 可选React/ECharts通用组件；不限制自定义页面源码 |
| packages/harness-plugin | 可安装个人profile插件，不包含第二个Agent |
| packages/database-adapters / connector-transport | 数据库执行、网络/秘密与签名传输 |
| services/query-worker / build-worker / deployment-worker | 独立查询、固定编译与受控静态部署 |
| services/preview-worker | 独立Chromium、指定TEST版本交互调试及截图 |
| infra/migrations | 0001–0013，共64业务表；旧迁移不可改写 |

~~~sh
pnpm contract:generate
pnpm test:gateway
pnpm test:studio
pnpm --filter @eas/harness-plugin build
~~~

插件0.2.5已按本机Desktop/tools0.2.1-rc.3重新编译，兼容声明覆盖0.2.1-rc.2和0.2.1-rc.3，Cordis仍为4.0.5。实际宿主测试仍由用户执行。使用桌面安装自带的dsh.cmd执行plugin --profile desktop add <absolute-tgz-path> --ignore-scripts；不要使用旧全局CLI0.1.5。当前个人Token通过工作区外的CurrentUser DPAPI密文配置。安装后由用户重启桌面端并测试真实工具，具体路径见安装记录。

默认服务器编辑与直接数据库配置见 [操作与实际边界](docs/server-workspaces.md)。插件安装后重启Harness，新会话先加载enterprise-sites Skill。

## 使用与验证文档

- [上线审批、正式运行与回滚](docs/releases-guide.md) · [阶段06验证](docs/stage06-validation.md)
- [报表、源码协议与业务使用](docs/reports-guide.md)
- [Harness研究、安装、配置和用户验收](docs/harness-plugin.md)
- [当前验证与未覆盖风险](docs/stage04-05-validation.md)
- [源码目录树、错误诊断与看板修复](docs/diagnostics-guide.md)
- [管理员版本查看与本地演示授权修复](docs/admin-version-access.md)
- [数据源管理](docs/catalog-guide.md)、[安全网关](docs/query-gateway.md)
- [API](docs/api-design.md)、[数据库](docs/database-design.md)、[架构](docs/architecture.md)、[安全](docs/security-design.md)、[ADR](docs/adr/README.md)

当前独立编译进程不是已验收的内核沙箱；未完成企业OIDC/mTLS/Vault、真实生产链、构建隔离/扫描签名、对象存储、完整Sites托管功能。MySQL/SQLServer网关仍无真实实例验收并保持关闭。阶段06/07必须补齐这些边界，不能把本地TEST演示当作生产上线许可。


最新：站点分享、个人访问令牌与人工文件上传的实际范围、操作步骤和限制见 [使用说明](docs/site-sharing-and-tokens.md)。个人令牌不包含生产或人类管理权限；真实Harness验收由用户执行。
