> 2026-10-26兼容更新：插件0.2.5适配Desktop0.2.1-rc.3，开发依赖统一到rc.3；engines/宿主peer声明明确支持rc.2与rc.3。版本和API依据、安装记录及未执行验证见[rc.3兼容说明](harness-rc3-compatibility.md)。

> 最新0.2.4：新增5个AI远程浏览器工具、官方图片附件返回和随包调试Skill指引。支持真实TEST页面交互、键鼠、DOM/样式、浏览器JS求值、控制台/查询诊断和截图；安装配置及未验证范围见[远程调试说明](remote-debugging.md)。本次不执行浏览器或Harness验收。
>
> 阶段06：插件已接入上线申请提交和状态查询，审批/正式部署通过门户完成，见 [发布说明](releases-guide.md)。下文阶段05历史功能记录保留。

> 0.1.5 更新：默认通过企业工具直接编辑服务器项目文件，无本地root限制或插件额外上传确认。随包注册 enterprise-sites Skill；完整操作见 [服务器工作区说明](server-workspaces.md)。 服务器源码工具已替代默认本地上传链路。

# 阶段05：DeepSeek Harness 企业桥接插件

## 研究与兼容依据

当前插件 **0.2.5** 按本机 **DeepSeek Harness Desktop 0.2.1-rc.3** 的实际类型重新编译。桌面自带dsh.cmd与app.asar中的desktop-host/tools/skill/attachment及客户端模块均为0.2.1-rc.3，Cordis4.0.5、Schemastery3.18.5保持不变。源码对比固定官方tag dsh-v0.2.1-rc.2（687f282e8625c6b8d11ff58211a90524be2e4317）与dsh-v0.2.1-rc.3（1f81c047fc48fa190a683e469daa699857e9afe8）。全局 npm 命令仍为旧CLI0.1.5-rc.1，不能据此判断正在运行的桌面版。历史0.1.0包针对旧CLI，不应用于当前桌面配置。

已阅读对应 tag 的官方工具教程、配置与安装文档、`packages/shell/tool-bash` 示例、工具 Schema 实现、ApprovalService 类型及本机已安装的声明文件。官方入口：

- [工具教程](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/user/develop/basic/tool.md)
- [工具契约与权限](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/cookbook/adding-a-tool.md)
- [配置](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/user/develop/basic/config.md)
- [安装与 patch 层](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/docs/user/develop/basic/publish.md)
- [真实 shell 示例](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.2/packages/shell/tool-bash)
- [宿主 JSON Schema 子集](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/packages/core/tools/src/json-schema.ts)

使用官方 `apply(ctx, config)`、`inject=['tools','skills','attachments']`、`ctx.tools.register`。注册是 Cordis effect，插件卸载时工具自动撤销。参数投影到宿主支持的类型/对象/数组/oneOf子集，长度、范围、pattern等完整约束仍由 execute 内 Ajv 验证；后端再做权威校验。没有编造 `registerSidebar`、`workspace.read` 或私有 Harness API。

## 工具

| 工具 | 平台调用与边界 |
| --- | --- |
| enterprise_connection_status | /me + capabilities，当前登录身份，不接受调用者 userId |
| enterprise_portal | 返回配置好的门户入口 |
| enterprise_datasource_list | 仅逻辑源概要与 test 能力，不返回物理连接 |
| enterprise_dataset_list | 授权目录，按 datasourceId 筛选 |
| enterprise_dataset_selected | 用户在当前会话选择的TEST数据集，读取时重新检验权限 |
| enterprise_dataset_schema | 服务端过滤后的语义版本、字段/指标/关系 |
| enterprise_dataset_preview | POST /queries/test，返回异步 queryJob |
| enterprise_query_status | 读取自己的查询状态与实际结果 |
| enterprise_app_create/list/get/versions | 同一套 REPORT/SITE 项目协议 |
| enterprise_workspace_list/read/write/edit/move/remove/checkout/commit | 服务器草稿文件、revision并发检查与不可变提交；默认开发方式 |
| enterprise_app_upload | 可选本地项目导入，完整或相对项目目录；不再额外强制确认 |
| enterprise_report_create/update/preview | 可选语义资源与版本；不生成代码 |
| enterprise_build | 固定编译配置，不能传命令 |
| enterprise_deployment_status | 构建状态与安全日志，无生产部署成功假响应 |
| enterprise_preview | 先检验实际预览可读，再返回门户的具体应用/版本 URL |
| enterprise_release_submit/status | 读取明确 disabled 状态，不创建虚假上线申请 |

所有执行必须有 Harness agent/session。`exec.signal` 传到 SDK 请求；超时和错误返回 `{ok:false,error:{code}}`，不把原始错误或 Token 输出给模型。普通日志仅安全事件名、工具名和有限错误码。查询是异步的：AI 使用 query_status 获取真实结果，不能将 queued 当作已有数据。

## 安装与配置

本仓库运行构建后提供独立 tgz。SDK、完整参数校验等内部依赖被打入插件 JS，发布包没有未发布的 workspace 运行依赖；宿主 Cordis、tools、Schemastery、ApprovalService 使用 peer 版本，避免第二份宿主运行时。

~~~sh
pnpm install --frozen-lockfile
pnpm --filter @eas/harness-plugin build
pnpm --filter @eas/harness-plugin pack --pack-destination outputs/harness-install
# Windows Desktop：使用该安装自带的 CLI（路径以实际安装为准）
& 'D:\新建文件夹 (3)\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add C:/absolute/path/eas-harness-plugin-0.2.5.tgz --ignore-scripts
~~~

按官方 patch 层，在该 profile 的 `cordis.patch.yml` 中填写完整配置。替换整行 config，不是深合并。当前桌面 profile 为 C:/Users/admin/.dsh/profiles/desktop。使用安装自带 CLI，由官方包管理器维护依赖与 bundle 清单；不修改 app.asar、不使用旧全局 CLI、不申请兼容性豁免。安装和配置完成后由用户重启宿主并验证工具。

~~~yaml
- id: enterprise-ai-studio
  config:
    apiUrl: https://studio-api.internal.example
    portalUrl: https://studio.internal.example
    organizationId: YOUR_ORGANIZATION_UUID
    workspaceRoot: 'C:/EnterpriseWork'
    tokenFile: 'C:/EnterpriseSecrets/studio-token.dpapi'
    timeoutMs: 15000
    allowLocalHttp: false
    logLevel: error
~~~

本地演示可显式打开 allowLocalHttp，仅接受 localhost/127.0.0.1，API/门户地址都不接受 URL 用户名或密码。API路径固定，重定向被拒绝；Token不能由工具参数改变。`workspaceRoot` 必须是人类预先批准的目录。

Windows 使用 `scripts/configure-harness-token.ps1 -TokenFile <absolute-file>`：交互读取 SecureString，写入 CurrentUser DPAPI 密文并设置当前用户 ACL，文件应位于工作区外且父目录提前创建。插件仅在私有执行路径解密到内存；不是把明文 Token 放进 YAML、环境变量或命令行。POSIX 使用工作区外、当前用户持有的0600文件；企业应按自身秘密策略替换为凭据代理。

插件配置 Schema 由官方加载器持久化到 Cordis patch，Token不属于配置字段。当前 Desktop0.2.1-rc.2 使用官方客户端 slots 提供原生“站点”入口与会话数据集选择器，不修改宿主核心。站点页可维护连接、版本、构建、测试预览和分享，用户也可打开企业 Web 门户操作。配置通过官方 patch 与受宿主 owner 认证保护的原生设置页面持久化。

## 身份与工作区边界

当前支持个人 Harness profile，一份插件配置绑定一个平台用户 Token。后端每次依据这个真实用户实时鉴权，不能把 agent 名称或工具参数当身份。多用户共享宿主的逐用户 OIDC 委托尚未实现，不能将一份管理员 Token 分享给所有人。

服务器模式不读取本地项目文件，通过正式工具调用平台workspace API，所有文件按当前组织和应用开发成员关系鉴权，写入必须带最新revision。

可选本地导入接受明确指定的项目绝对目录或相对会话cwd目录，不再检查固定workspaceRoot白名单，也不调用额外的ApprovalService。只采集项目清单和编译所需源码，后端仍校验来源、成员、数据权限并生成不可变版本。默认文件夹仅用于新会话或人工导入的相对路径。

宿主原生 shell/文件工具与插件本身处于用户机器信任域。DPAPI 防止密文脱机读取，不保证同一操作系统用户下已获无限 shell 权限的 Agent 无法解密。企业应限制宿主原生工具对秘密目录和配置的访问；Windows reparse/文件竞态、插件恶意替换和多用户身份委托仍需企业宿主环境安全验收。

## 用户手动验收（按本次要求）

本阶段**没有运行真实 Harness 插件加载、Skill发现/加载、工具调用、Token解密或 Agent 自动编码测试**，也没有伪造一次“插件加载成功”。已完成源码研究、TypeScript检查与安装包构建。真实宿主测试由用户进行；不把本机仅有 dsh 版本输出计入插件运行验收。

建议按顺序检查连接、过期Token、目录无权限、参数类型错误、queryJob真实结果、创建REPORT/SITE、工作区源码上传确认、build/status/preview、同一项目第二版上传与生产绕过拒绝。确认服务器文件修改、并发revision冲突、撤权和网络中断返回受控错误；可选本地导入从完整路径正常工作。完整业务指令见包内 workflow.md。

阶段06接入真实上线申请 API 时，仅替换 release 工具的类型安全调用；它们不能增加审批工具。阶段07扩展固定依赖、对象存储、独立构建沙箱、协作成员和通用Sites托管数据能力；继续共用上传与版本协议。

## 原生 Sites 界面与连接修复（0.1.5）

- 使用实际Desktop0.2.1-rc.2的dsh.client声明和./client导出，esbuild输出官方window.__ModuleLoader__.load惰性CJS工厂；React从宿主模块表读取，不打入第二份React。
- 插件/站点/自动化任务顺序为0/5/10。站点页真实读取/apps与版本、构建日志、历史草稿恢复。opaque iframe按manifest.queryKey绑定真实TEST预览；iframe消息来源/origin/并发均受限制。
- “新建站点”注册或复用配置的源码工作区，通过官方uiWorkspace.startSession(...,{prompt,clearPreviousDraft:false})打开草稿。不自动发送或抢占已有草稿；纯文本预填不伪造插件@提及。用户发送后由原生Agent生成代码、调用工具创建平台应用。
- 会话选择器只读取授权逻辑源/数据集。选择按sessionId保存，AI上下文仅含标识与TEST约束；enterprise_dataset_selected与实际查询前仍由服务端重验权限。
- Host从源码确认/api只有一个interceptor，属于Gateway。0.1.5修复了先前冲突：使用connection.fetch.register注册每个精确/api/enterprise-sites/<action> POST路由，沿用Connection认证及owner fence。Client仍经connection.rpc.call发送标准client-request/server-response信封；未增加公共SQL或模型可调用配置工具。
- UI请求采用固定动作白名单及Ajv校验，拒绝未知字段、任意路径/命令/环境。修改服务器或组织需要新Token，避免将已有凭据发送到另一地址。UI只收到hasToken，Token不进入响应。修改配置取消旧代请求；秘密路径始终在工作区外。
- 企业内网IP填写完整HTTPS地址，例如https://10.10.20.15:3000；开发演示可显式允许localhost HTTP。后台地址不是数据库地址。当前是个人桌面profile身份，不提供共享账号委托。

组件排版截图只证明搜索框、字体及未连接状态的视觉检查；不属于Harness加载、工具执行或Agent端到端验收。按用户要求，宿主交互、真实选择/创建/上传/确认仍由用户验证。


最新：站点分享、个人访问令牌与人工文件上传的实际范围、操作步骤和限制见 [使用说明](site-sharing-and-tokens.md)。个人令牌不包含生产或人类管理权限；真实Harness验收由用户执行。

0.2.0 增加网页/工具/RPC 的详细错误、字段说明和追踪编号；预览查询改为排队，历史版本失败也显示平台诊断面板。具体行为见 [诊断说明](diagnostics-guide.md)。宿主验收仍由用户执行。
