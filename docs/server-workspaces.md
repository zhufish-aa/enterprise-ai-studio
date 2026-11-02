# 服务器文件编辑与连接配置

默认开发方式是服务器项目工作区。Harness 编写完整代码，通过插件直接创建、读取和修改平台文件；提交版本、构建与测试预览不依赖本地目录或上传确认。网页“我的应用 → 服务器源码”操作相同文件，Harness 站点详情也提供该页面入口。

## 文件和版本

服务器文件持久化在 PostgreSQL 的 app_workspaces / app_workspace_files，不映射到 API 主机的任意系统路径；多台 API 实例共享相同草稿。项目归属 appId，授权来自当前组织、成员状态和应用开发成员关系。数据库 FORCE RLS 提供租户隔离。组织内分享的访客不能因此读取或修改源码。

草稿可创建、覆盖、精确替换、重命名、删除；每次写入带 revision，服务端锁定工作区并比较修订号。409 时先重新读取并合并。批量写入在一个事务中完成，某一文件失败全部回滚。精确编辑默认 oldText 唯一匹配；不存在或多次匹配返回 WORKSPACE_EDIT_CONFLICT。

工作区提交读取同一事务中的全部文件，解析 studio.manifest.json，实时验证数据集版本、字段、指标和查询绑定，复用源码版本服务形成不可变 artifact / app_version。提交不是生产发布。checkout 仅替换草稿，历史源码和版本不变；用户需明确选择历史版本，不自动覆盖已有草稿。

当前固定构建接受 src 下 ts/tsx/css、package.json、README.md 和单独解析的 studio.manifest.json；200文件、单文件128KiB、总计512KiB。该范围对应现有静态 React 编译器；平台不运行项目脚本、安装任意依赖或提供服务器 Shell。目录由文件路径自动形成，不需要空目录接口。更多格式和通用服务端应用留到阶段07。

## 工具与接口

| Harness 工具 | REST 路径（前缀 /v1/apps/{appId}/workspace） | 内容 |
| --- | --- | --- |
| enterprise_workspace_list | GET 空后缀 | revision、文件摘要、baseVersionId |
| enterprise_workspace_read | POST /read | path → 全文、digest、revision |
| enterprise_workspace_write | POST /write | revision、files[{path,content}] |
| enterprise_workspace_edit | POST /edit | revision、path、oldText、newText、replaceAll? |
| enterprise_workspace_move | POST /move | revision、from、to |
| enterprise_workspace_remove | POST /remove | revision、paths |
| enterprise_workspace_checkout | POST /checkout | revision、versionId |
| enterprise_workspace_commit | POST /commit | revision、message → version、workspace |

所有 POST 带 Idempotency-Key；Cookie 请求另带当前 CSRF。身份和应用关系在幂等响应回放前重新检查，撤销成员后不能重放文件全文。SDK 提供对应的类型安全方法。文件全文只进入授权响应和服务端源码存储，不进入普通请求日志/审计元数据。read 使用 POST 承载受校验路径，避免把文件路径放入动态路由或任意系统 URL。

## 插件内置 Skill

@eas/harness-plugin 0.1.9 随包包含 skills/enterprise-sites/SKILL.md、契约参考和最小 React/ECharts 示例。按实际 Desktop0.2.1-rc.2 的官方 ctx.skills.registerProvider 注册，在宿主 skill 工具中按 enterprise-sites 加载。说明中完整提供服务器编辑顺序；新的站点和继续开发草稿提示也要求先加载该 Skill。

QuerySpec 与 SourceManifest 参考 Schema 从唯一 OpenAPI 自动提取，随构建打包，避免另写一套过时契约。Skill 是编程指导，不是权限凭证或第二个 Agent。用户自定义同名项目 Skill 的优先级仍服从宿主官方规则。

旧本地导入为可选功能：projectPath 接受绝对项目目录或相对当前会话目录的路径，取消固定 workspaceRoot 白名单及插件强制 allowed-once 提示。workspaceRoot 仅作为新会话/手工导入的默认目录；服务器工具不读取该目录，不依赖会话 cwd。宿主自身的工具权限与平台资源权限继续生效。包内仍保留人工检查文件并导入入口。

## 网页源码浏览

应用的“服务器源码”页按实际服务器文件路径生成多级目录树，文件夹在前，文件按名称排序。支持逐级展开、全部展开/折叠、文件名或路径搜索、文件类型图标及选中高亮。键盘上下移动，左右展开/折叠，Enter 打开文件。右侧显示文件路径、源码、类型和行数。

源码面板使用按需加载的CodeMirror编辑器，按扩展名解析TS、TSX、JS、JSX、JSON、CSS和Markdown，区分关键字、字符串、函数、类型、JSX标签与注释；Markdown围栏代码也按声明语言高亮。浅色主题提供行号、当前行提示、括号匹配、代码折叠、查找/替换、Tab缩进及撤销/重做。Ctrl/Cmd+S保存当前有修改的文件，仍使用原有workspace revision接口。切换文件隔离编辑器历史，未保存文本继续保留在原页面缓冲区；打开源码不会自动保存或提交版本，LF/CRLF换行按当前文件保留。所有源码仅作为编辑器文本解析，不生成可执行预览，不上传到外部高亮服务。

应用页移除“我的应用”大标题、英文眉题和宣传文案；刷新、新建应用与应用切换卡片放在同一行。源码视图占用窗口剩余高度，目录和代码分别内部滚动，长文件不再撑高外层页面，保存及提交版本控件保留。AI 可通过新增的[远程调试和截图工具](remote-debugging.md)操作真实 TEST 版本；修改源码后提交新版本，再打开对应新版本调试。

2026-10-24此次高亮改动仅完成锁文件依赖安装及必要前端编译；按照用户要求，不运行自动化或浏览器验证。

切换文件保留当前页面内未保存的编辑；树上的小圆点标记修改。可保存单个文件或一次保存全部修改，然后提交不可变源码版本。刷新浏览器会丢弃尚未保存的浏览器内编辑；“刷新服务器文件”和载入历史版本在有修改时不可用。远端读取不会提升旧编辑缓冲区的 revision；多人修改冲突仍返回 WORKSPACE_REVISION_CONFLICT，需读取并合并，不会盲目覆盖。

查询错误和历史版本的诊断见 [错误诊断说明](diagnostics-guide.md)。

## 直接配置数据库

管理员进入“物理连接 → 新建连接”，直接填写数据库类型、环境、主机、端口、数据库、用户名及密码。高级设置包含 TLS、超时、连接池、可选的明确表/视图范围。测试连接会先保存当前配置，再创建真实健康任务；保存连接则只登记配置。无需先维护端点、库名和凭据别名下拉框。

POST /physical-connections/configure 需要人类身份及 network.manage、connection.manage；普通业务成员和个人 AI Token 不具备这些能力。后台自动创建精确IP白名单端点及新的安全凭据别名，旧端点/旧别名不修改。DNS 在登记时解析成明确IPv4地址，connector 连接时再检查实际解析地址；所有解析结果必须在固定 /32 清单。元数据只读取显式指定对象，不默认扫描全部数据库/表。范围留空可检查连接；需要同步时，在配置中明确填写对象；当前暂不提供连接后自动发现所有对象的数据库浏览器。

凭据在服务端使用 AES-256-GCM 加密，环境和随机引用绑定为 AAD，元数据库仅存 managed:test/production:UUID 引用。主密钥独立保管，不放元数据库、源码、包、API响应或日志。API写入与对应connector读取同一受保护存储；TEST与PROD使用独立目录、密钥和环境进程。当前本机仅配置TEST存储。托管凭据是企业 Vault 的另一种部署选项，并非已实现的HSM或企业密钥轮换服务。

API 配置 CATALOG_TEST_MANAGED_SECRET_DIR / CATALOG_TEST_MANAGED_SECRET_KEY_FILE（生产改 PRODUCTION）；worker 配置 CATALOG_MANAGED_SECRET_DIR / CATALOG_MANAGED_SECRET_KEY_FILE。目录和32字节随机密钥由部署运维创建；POSIX密钥0600，目录0700，Windows限定服务用户和SYSTEM ACL。API和worker跨机时需受控存储挂载或凭据服务，不把密钥随源码分发。未配置、密钥错误或存储不可用则明确拒绝保存，不能假装连接成功。运维应备份密钥和密文、定期清理无数据库引用的密文；事务最后阶段失败可能留下不可访问的孤立密文。

生产TLS强制校验；本机开发TEST填写localhost/127.0.0.1时默认使用无TLS测试模式，其他地址默认校验证书；只有该本机TEST组合允许无TLS，不能用于生产或其他地址。管理生产连接不等于获准查询生产业务；生产检查仍有独立权限及新鲜认证要求。执行账号应由DBA授予只读和最小对象权限；填写账号不能代替数据库侧授权。

高级“使用已登记的端点和凭据”仍可使用；“物理连接 → 网络端点”可单独登记地址、数据库和对象范围。新增只执行登记，不触发探测。网络端点权限是新的显式管理权，默认只赋予离线初始化的平台管理员；普通连接维护员不自动获得。

## 验证范围

tests/server-workspace.integration.test.mjs 使用真实PG、独立销售库和固定编译worker，验证服务器写入/读取/精确编辑/删除/重命名、并发冲突、事务回滚、权限撤销后的回放拒绝、不可变提交、两个版本构建、历史载入、真实查询47040元/60笔。tests/connection-setup.integration.test.mjs 验证普通/AI拒绝、一次填写的加密存储、真实PG健康/结构读取、错误密码、地址拒绝和响应/日志/审计/幂等脱敏。

真实Harness加载、Skill目录、Agent调用和宿主UI仍按用户要求由用户测试；安装、类型检查、平台API和浏览器验收不替代它们。生产发布、企业网络/mTLS、内核沙箱、MySQL/SQLServer真实实例、凭据轮换/灾备未在本机验收。

此前服务器编辑交付的完整检查共121项测试通过；安装包0.1.5曾完成Host/Client/9份Skill资源安装校验。

本次目录树在真实浏览器中验证多级目录、键盘导航、搜索、全部展开/折叠、多文件编辑保留和实际服务器保存。后续详细错误修复完整检查127项通过，0.1.9已安装并核对配置/凭据不变。销售看板v4的7项真实查询通过；旧v3的详细日期绑定错误也已实际验证。管理员草稿保留，未覆盖未提交修改。详见diagnostics-guide.md及outputs/source-browser/live-validation.json。真实Harness宿主验收仍由用户执行。
