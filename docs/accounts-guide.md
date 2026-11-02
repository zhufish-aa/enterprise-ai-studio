# 账号登录、注册与管理员初始化

网页现在使用账号密码登录。个人访问令牌用于登录后授权 Harness 等客户端，不再作为网页登录表单。已登录用户刷新页面可恢复会话，退出登录会撤销服务器会话。

登录失败直接显示“账号或密码错误，请重新输入。”。登录、注册和修改密码表单只显示可操作的业务原因，不展示接口路径、HTTP 状态、处理方法和请求编号；完整诊断仍保留在 API 错误对象中。网络连接失败单独提示无法连接服务器，邀请码、密码格式等错误使用对应文案。

2026-10-30：登录入口采用浅色宽幅面板，左侧为本地 SVG 几何插画，右侧为账号表单；窄屏收为紧凑插画栏与表单上下布局。保留简洁品牌信息，不使用大块深色背景、宣传口号、假业务数据或页脚标语。门户统一使用 Segoe UI 与 Microsoft YaHei UI 系统字体，正文和导航以 14px 为主，辅助文字保持 12–13px，统一加深文字颜色；页签、表格、审批与源码工具栏采用同一层级。生成站点的独立 iframe 内容不受门户主题影响。本次仅完成 SDK/Web 编译与服务就绪检查，按用户要求未运行自动化或浏览器测试。

## 本机使用

打开 http://127.0.0.1:5173/。本机已初始化管理员账号 admin，以及保留销售示例权限的 developer 账号。临时密码随机生成，不是固定的 admin/admin 或公共默认密码；保存在不纳入源码、日志和交付包的 work/initial-login.json，当前 Windows 文件设置为当前用户和 SYSTEM 可读。管理员临时密码已单独提供给本机用户。首次登录必须更换密码，修改前服务器拒绝业务查询、配置、令牌签发和邀请码管理。

管理员登录后，左下角进入“注册设置”，可以切换“注册需要邀请码”。开关自动保存到当前组织，默认开启，服务重启后保留。

- 开启：用户需要有效邀请码才能注册。在同一窗口的“邀请码管理”填写备注、初始业务权限和有效期，创建一次性邀请码；可以复制、撤销及查看使用状态。
- 关闭：注册页不再要求邀请码，新用户直接注册为业务开发成员。新账号没有管理员、审批人或数据集访问授权，后续由管理员分配资源权限。多组织都开放注册时，用户选择所属组织；只有一个组织时自动使用该组织。

关闭开关后，已有邀请码仍可按原角色使用。注册页保留“使用邀请码注册”入口，可用于加入其他需要邀请的组织。重新开启后，后端立即拒绝未带邀请码的注册请求；即使用户打开了旧页面，也以服务器的最新设置为准。

账号3–64字符，字母开头，可包含数字、下划线、点和短横线；统一转小写。密码12–128字符，不要求记忆复杂的定期轮换规则，支持浏览器密码管理器。管理员提供的临时密码强制首次修改；用户可在“账户安全”修改自己的密码。忘记密码由受信任运维通过离线命令重置，没有伪造邮件找回服务。

业务开发成员可以创建应用、管理自己的源码和使用授权TEST数据；只读成员仅查看已有授权元信息。两者都不会自动获得数据集、物理连接、管理员、审批或生产权限。管理员继续在“资源权限”中给成员分配具体数据集、字段、指标及部门范围。邀请码创建者失去成员资格/邀请权限或业务授权时，未使用的邀请码会拒绝兑换。

## 企业部署配置

在现有API环境变量中设置 PLATFORM_PASSWORD_AUTH=true 和 PLATFORM_PORTAL_ORIGIN=https://studio.internal.example；非本机环境要求HTTPS门户与Secure Cookie。PLATFORM_PORTAL_ORIGIN仅由部署者配置，不接受请求传入的任意Origin。现有OIDC入口保留，账号密码模式可独立启用，但没有声称已实现企业SSO跳转、MFA、邮件验证或自助找回。

运行迁移0007后，由受信任运维使用MIGRATION_DATABASE_URL执行 node scripts/initialize-account.mjs。输入从stdin传入JSON，包含organizationId、username、displayName、password；首次管理员设置administrator=true。支持将现有组织成员userId绑定为密码账号，保留其既有资源归属。数据库中必须已经存在目标组织。密码不可作为命令行参数、环境变量、YAML或CI日志输出。重复初始化拒绝覆盖，重置必须显式reset=true；离线重置会撤销该用户的网页会话和个人令牌，并再次要求修改临时密码。

pnpm dev:local自动为本次独立演示库生成随机临时密码，将其保存在私有work/initial-login.json，不打印到控制台。每次dev:local仍创建新的临时演示环境。本次升级对原本运行的数据库执行增量迁移，没有重置组织、账号ID、站点、源码版本或授权。

## 注册设置接口

- `GET /registration-settings`：当前组织的 `account.manage` 人类管理员读取设置，返回 `organizationId`、`invitationRequired`、`revision` 和 `updatedAt`。
- `POST /registration-settings`：请求 `{invitationRequired:boolean, expectedRevision:number}`；沿用组织头、Cookie CSRF 和 Idempotency-Key。修改检查当前组织成员和管理员权限，保存审计及数据库记录。旧 revision 返回 `REGISTRATION_SETTINGS_CHANGED`，同一幂等请求不重复修改。
- `GET /auth/options`：公共注册选项返回 `registration: invitation|open` 和 `openOrganizations: [{id,name}]`；只公布已明确开放注册的组织。
- `POST /auth/register`：邀请码注册填写 `invitationCode`；直接注册填写 `organizationId`，二者只选一个。后端在事务内锁定组织并检查当前配置，拒绝自定义角色、管理员身份等字段。

Migration 0013 新增 `organization_registration_settings`，以组织 ID 为主键，开启 FORCE RLS；未配置组织保持需要邀请码。公共函数只返回开放组织的 ID 和名称。注册角色由后端固定，设置关闭不授予任何数据库凭据或数据集权限。补充 `tests/registration-settings.integration.test.mjs`，按用户要求本次不运行测试，仅完成契约生成、编译、迁移及服务更新。

## 已实现的边界

- 会话为8小时opaque Cookie，HttpOnly、SameSite=Strict、Path=/v1；HTTPS启用Secure。数据库仅保存会话值SHA-256摘要，浏览器不将密码或登录Token写入localStorage/sessionStorage。
- Cookie状态变更同时验证部署白名单Origin和与会话绑定的CSRF值；Bearer SDK继续使用原协议，不能借Cookie切换调用者。
- scrypt参数N=131072、r=8、p=1，独立随机盐，异步计算并限制并发2个；登录有数据库中的IP/账号限流，注册有IP限流，错误不泄露数据库异常或密码。
- 首次密码修改、会话有效期、账号/组织状态和实时RBAC在后端执行。网关任务保存内部会话ID，租约/完成/结果读取重验；退出后旧查询结果不能继续读取。修改密码撤销其他网页会话。
- 密码登录属于单因素交互身份，不能获得生产查询/连接检查和发布审批权限。创建资源授权也不能超出当前调用者的权限。正式生产发布仍未启用。
- 公共接口没有创建管理员或指定角色的入口。管理员通过离线初始化产生；邀请仅能绑定服务端固定的viewer/developer业务角色，且检查邀请者当前授权上限。
- 登录/退出/注册/离线初始化与邀请操作写安全审计元信息；邀请码、密码、Cookie或密码Hash不出现在日志、审计或通用幂等响应缓存中。

## 接口与幂等

OpenAPI是唯一契约。新增GET /auth/options、POST /auth/login、POST /auth/register、GET /auth/session、POST /auth/logout、POST /auth/password；GET/POST /registration-invitations和POST /registration-invitations/{invitationId}/revoke。所有POST要求Idempotency-Key。Cookie变更要求Origin和X-CSRF-Token；登录、注册不依赖既有Cookie，但仍要求白名单Origin。

登录每次都验证密码；相同用户和请求key在会话有效期内使用同一会话记录，不回放含密码的响应缓存。撤销的会话不会因重复登录key复活。注册重复兑换拒绝，创建邀请码重复key返回409且不回放秘密；密码修改撤销旧会话，响应丢失时应使用新密码重新登录。退出的旧凭据再次请求401，不允许其继续业务访问。

Migration0007新增password_accounts、auth_rate_limits和organization_invitations（累计58表），并扩展auth_sessions的ID和认证方式。用户名唯一；邀请码摘要唯一、组织/创建者/请求key唯一，业务角色通过同组织复合FK约束，邀请表FORCE RLS。全局账号/限流表仅供可信身份模块使用，不向普通业务API暴露。

真实验证在tests/accounts.integration.test.mjs，覆盖账号初始化/强制改密、Cookie属性、跨域及CSRF拒绝、注册角色伪造、一次性/撤回/到期邀请码、并发兑换、邀请者撤权、业务越权、真实销售TEST查询、退出后旧结果拒绝、PAT委托与登录限流。独立库返回47040元/60笔。真实Harness测试仍由用户执行。
