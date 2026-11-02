> 阶段03升级：测试预览改用统一查询网关，必须另配query_policy_head、当前成员部门范围和明确dataset.query.test资源授权。旧/datasets/{id}/preview返回410。原来“只有数据集授权/没有行隔离”的阶段02说明属于历史能力；当前使用与迁移见[query-gateway.md](query-gateway.md)。


# 阶段 02 安装与使用

## 1. 环境与结构初始化

本机演示使用根 README 的 pnpm dev:local。企业部署使用长期存储的 PostgreSQL 元数据库，不使用临时演示集群。迁移账号与 API 账号分开。修改现有已应用迁移会因 SHA256 校验不一致失败；后续结构变更新增编号文件。迁移使用 advisory lock 和逐文件事务，失败自动回滚当前文件，旧文件不重跑。

~~~powershell
$env:MIGRATION_DATABASE_URL = '<通过安全会话设置的元数据库迁移 URL>'
pnpm db:migrate
pnpm catalog:configure infra/operator-config.example.json
~~~

示例配置必须换成企业批准的组织、OIDC issuer/subject、端点、CIDR、数据库、对象和 Vault 路径。它包含秘密**引用**，没有秘密值；也应按运维配置管理。CLI 是有审计的特权运维入口，普通 API 用户不能调用。初始用户、角色、绑定采用增量插入；不负责身份生命周期同步或撤权。现有端点和凭据目标不可原地变更；新建 ID，经检查同步后切换映射，原记录保留。凭据轮换在 Vault 原路径更新版本。企业撤权需要身份同步适配器或受审计的运维事务，同时递增 policy_epoch；没有提供浏览器角色管理。

创建独立 LOGIN 角色，授予 eas_api，确认它没有超级用户、BYPASSRLS、CREATEROLE 或其他继承权限。示意 SQL 中口令由秘密管理注入，不能提交：

~~~sql
CREATE ROLE eas_runtime LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
GRANT eas_api TO eas_runtime;
-- 使用受保护管理会话设置随机口令或企业证书认证
~~~

设置 API 的 DATABASE_URL 为该角色；启动时拒绝超级用户与 BYPASSRLS。真实测试对运行角色验证了 FORCE RLS 与审计日志不可删除。

## 2. API 环境变量

| 变量 | 内容 |
| --- | --- |
| DATABASE_URL | 元数据库运行账号；不使用迁移账号 |
| API_HOST / API_PORT | 监听地址，默认本机；生产由 TLS/网关策略限定 |
| CATALOG_CURSOR_KEY | 至少 32 字符随机密钥，用于签名分页游标 |
| OIDC_ISSUER / OIDC_AUDIENCE / OIDC_JWKS_URL | HTTPS 企业发行者、受众、JWKS |
| OIDC_HUMAN_CLIENT_IDS | 允许交互管理的客户端 ID，逗号分隔；另要求 amr 包含 MFA |
| CATALOG_TEST_URL / CATALOG_TEST_KEY | 固定 TEST connector 地址和独立共享签名密钥（至少 32 字符） |
| CATALOG_PRODUCTION_URL / CATALOG_PRODUCTION_KEY | 固定 PROD connector 地址和另一组密钥；不配置则生产任务失败关闭 |
| API_SERVER_TLS_CERT / KEY / CA | API TLS 文件路径；生产 connector 回调要求有效客户端证书 |
| CATALOG_CLIENT_TLS_CERT / KEY / CA | API 调用 connector 的 mTLS 文件路径 |

普通成员和管理员都使用企业 access token。人类管理身份由签名 azp/client_id 白名单和 MFA amr 决定，不能仅凭 token 静态角色。每个请求读取数据库中当前成员状态和角色权限。生产检查/同步还要求 auth_time 在五分钟内。页面目前采用 access token 输入，未提供浏览器 OIDC 授权码/PKCE 登录；企业可以经现有 SSO 门户进入，下一步应完善标准登录回调，不能把令牌输入演示当成完整 SSO 产品。

NODE_ENV=development/test 且 CATALOG_ALLOW_LOCAL=true 才能使用本地不透明测试会话、环回 HTTP 和仅 TEST 的秘密文件。企业部署不可开启。

## 3. 独立 connector 配置

~~~sh
node apps/platform-api/dist/main.js
node services/query-worker/dist/main.js
~~~

第二条在独立网络区执行，每个环境各启动一个进程或容器。设置 CATALOG_WORKER_ENV=test 或 production、CATALOG_API_URL、CATALOG_WORKER_KEY、CATALOG_WORKER_PORT（默认3100）、CATALOG_WORKER_HOST。默认只监听127.0.0.1，跨机监听需要显式配置。API 目标与 worker 签名密钥相配。

设置 CATALOG_SERVER_TLS_CERT/KEY/CA 和 CATALOG_CLIENT_TLS_CERT/KEY/CA，使用每环境专用 CA 与固定地址，避免让其他受信内部证书获得工作负载身份。生产模式强制 HTTPS/mTLS，拒绝 fixture。Vault 使用 VAULT_ADDR（固定 HTTPS 地址）、VAULT_TOKEN_FILE（只读文件）、VAULT_SECRET_PREFIX（如 secret/data/test）、VAULT_CERT_PREFIX（如 secret/data/certificates）。只允许该前缀之下的引用，禁止任意 URL、重定向和路径穿越。KV v2 数据为 username、password，revision 使用 Vault version；证书数据为 pem。业务数据库连接使用 verify-full 和指定 TLS server name。私有 CA 可用 caRef 从 Vault 取得，企业 Vault 自身 CA 使用 Node 受信 CA 配置。

API 没有业务数据库驱动依赖；driver 包仅在 connector 中运行。主机防火墙强制 API 只能到元数据库、TEST connector 只能到批准测试源、PROD connector 只能到批准生产源。HMAC 不代替 mTLS，应用 CIDR 不代替主机路由隔离。生产 secret token 权限不允许读取测试或其他环境路径。

## 4. 管理操作

1. 运维用 CLI 登记批准的端点与凭据别名，设定准确 CIDR、数据库和表/视图。创建最小权限账号：仅 CONNECT、目标 schema USAGE、批准对象 SELECT；不授予写入、DDL 或跨库权限。
2. 管理员登录，新建逻辑源，填写系统编码、部门、负责人和敏感级别。key 与 engine 是稳定身份，创建后不可变；变更数据库类型创建新源。
3. 新建连接时选择 TEST/PROD、类型、已批准端点、数据库和凭据别名。选择元数据范围，配置超时和池上限。不得输入主机或口令。连接目标与凭据别名创建后不可变，编辑允许停用及超时/池配置。
4. 对目标执行连接检查（仅 SELECT 1），再选择对象同步。健康与结构读取权限分别检查，PROD 使用独立权限和新鲜认证。同步失败保留上次成功快照，可从失败任务重试。
5. 在逻辑源“环境映射”选择同环境、同类型、已健康且已同步连接，保存生成新映射修订。目标必须覆盖现有数据集引用字段。TEST 从不自动回退 PROD。
6. 创建数据集草稿，在语义编辑器选择 TEST 快照和一个来源表/视图；选择字段、稳定编码、业务名、敏感级别、维度和过滤能力。定义 sum/avg/count/countDistinct/min/max 指标、计算字段、口径、过滤条件和可用维度。关联关系固定目标数据集版本且必须同一源、类型匹配。本阶段保存关联语义，预览不执行自动 JOIN；需要跨表指标时由 DBA 提供授权视图。
7. 保存为不可变版本，再启用数据集。新的修改创建新版本；不覆盖旧版本。字段说明默认引用同步注释，可在业务名称下方补充说明；API 对应 description。
8. “访问权限”选择资源、成员、动作、有效期和明确字段/指标。dataset.read 与 dataset.query.test 分别授权；空数组表示没有字段/指标权限。可撤销；后续请求、任务领取及结果读取重新检查当前授权。
9. 业务成员登录，只能看见授权的启用目录和数据集。测试预览最多100行，设置维度/指标/参数化过滤，服务端固定选择 TEST。结果仅发起人可读取，最多保留五分钟。生产运行查询接口本阶段未开放。

## 5. 模块限制与维护

数据集级授权不等同于细粒度业务行策略。本阶段 TEST 账号必须限定可安全共享的测试行，声明中的 test_dataset_organization_v1 表示授权测试数据集，不代表已经实现员工级、地区级行隔离。生产运行授权、行策略注入和审批链留给后续发布阶段，当前不得开放生产数据查询。

关闭连接或数据源使预览停止；修改授权和映射递增组织 policy epoch，使在途任务和旧结果失效。池最多16个配置指纹、每连接最多8个连接；闲置60秒后在下一任务清理，凭据轮换时关闭同连接旧的空闲池。结构同步每次最多20个对象、每对象最多500字段，结果超限失败，不静默吞掉对象。大目录需要分批同步；任务表需运维归档，预览数据五分钟后清理。

执行 pnpm check 检查迁移、真实数据库边界和编译。不能以本机测试替代企业身份、Vault、mTLS、真实 MySQL/SQL Server 和网络隔离的环境验收。详细状态见 stage02-validation.md。

## 当前连接表单更新

网页已支持管理员像数据库管理工具一样直接填写主机/端口/数据库/账号/密码，保存时自动登记固定网络端点及加密凭据别名；旧文档所述必须先用CLI维护下拉选项不再是普通新建连接的前置条件。CLI继续用于高级运维预置。network.manage与人类身份限制后台登记，生产查询仍需后续有效发布授权。参见[服务器编辑与连接配置](server-workspaces.md)。网页登录现已支持账号密码及邀请注册，旧令牌输入说明为历史方式。
