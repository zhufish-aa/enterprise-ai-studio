# Enterprise AI Studio 工程规则

开发前阅读本文件、`docs/AI_DEVELOPMENT_RULES.md`、`README.md` 及相关架构文档。阶段 00 的业务契约是设计基线；阶段02数据源基线见docs/catalog-guide.md；阶段03网关、真实验证和风险见docs/query-gateway.md与docs/stage03-validation.md。不得把文档设计、参考 DDL 或未连通的端口描述为已经生效的安全能力。

阶段04/05基线见docs/reports-guide.md、docs/harness-plugin.md和docs/stage04-05-validation.md；阶段06见docs/releases-guide.md、docs/stage06-validation.md与ADR0021。AI代码生成由Harness Agent完成，默认通过插件读写服务器项目工作区，平台不增加模型生成服务。源码与报表版本追加；固定编译服务不运行上传脚本。测试构建仍为preview_only，正式运行另外要求不可变审批、受控部署凭证和有效运行授权，不能修改测试构建标记冒充正式发布。Harness真实测试按用户要求由用户执行，不得将构建或API验证写成插件宿主验收。

## 工程边界

- 使用 Node.js 24、pnpm 10.12.1、TypeScript strict；提交锁文件，使用 `pnpm install --frozen-lockfile` 验证重现。
- 控制平面采用模块化单体。业务模块通过应用服务和契约交互，不跨模块直接访问私有表或实现文件。
- `shared` 只放无副作用的值类型；`api-contract` 不依赖应用或服务。浏览器、Harness 插件与 worker 不导入 API 内部模块。
- OpenAPI 源文件为 `packages/api-contract/openapi.json`；修改后运行 `pnpm contract:generate`，不可手改生成类型。
- 数据命名在 SQL 使用 snake_case，在 REST JSON 使用 camelCase；单复数和关系映射以数据库设计为准。

## 安全不变量

- AI 输出、源码、工具参数和报表配置都不可信。平台 API 禁止 `eval`、动态执行上传代码或转发任意 SQL。
- 开发查询的环境固定为 test。生产物理连接选择、授权、审批及切换仅由服务端执行。
- 不以客户端隐藏按钮、token 内的静态角色或队列来源代替实时资源鉴权；审批不得接受客户端传入的审批人身份。
- 源码、报表、数据集、映射及审批快照不可原地篡改。回滚产生新发布申请，不恢复失效授权。
- 凭据使用秘密引用，日志和 API 不返回口令、连接串或原始数据库错误。
- 不通过关闭 strict、忽略类型错误或放宽拒绝路径来使检查通过。

## 验证与交付

运行 `pnpm check`，并按改动补充能验证真实边界的测试。业务安全功能需要真实数据库、实际身份和隔离执行环境的集成验收；本地单元检查不能替代它们。阶段06已接入顺序审批、固定静态部署服务、正式运行授权与新申请回滚；真实业务生产库、企业PKI/身份/秘密管理和通用服务器沙箱仍未验收。新增查询不得恢复旧preview旁路；无安全策略或生产事实必须失败关闭。查询接收不恢复旧在途数量拒绝，TEST不恢复预设行数上限。

当前默认服务器文件编辑：app_workspaces草稿可变，commit生成不可变版本；revision冲突必须合并，禁止盲目覆盖。用户已明确取消插件固定workspaceRoot白名单及额外上传确认；本地导入仅可选，默认工作区只是会话目录。数据库新建连接使用管理员单表单，后台network.manage及connection.manage验证后加密保存口令，不回显/入AI上下文。当前说明及验证见docs/server-workspaces.md、ADR0016/0017。
