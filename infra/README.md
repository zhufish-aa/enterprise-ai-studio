> 阶段02：原生本机完整演示见根README和docs/catalog-guide.md。Compose默认仍仅启动基础设施，platform profile未注入DATABASE_URL时只提供健康骨架；不代表完整catalog部署。真实初始化使用infra/migrations与pnpm db:migrate。新增Dockerfile.connector，API镜像按依赖拓扑构建；两镜像当前均未Docker实测。

# 本地基础设施与部署边界

`compose.yaml` 仅用于本地开发：元数据库、Redis、可选测试源、可选 API 骨架。没有生产业务数据库、生产凭据或任务执行器。基础设施与骨架 API 不依赖业务模块完成。

```sh
pnpm env:init
docker compose --env-file .env -f infra/compose.yaml config --quiet
pnpm infra:up
docker compose --env-file .env -f infra/compose.yaml --profile test-source up -d
docker compose --env-file .env -f infra/compose.yaml --profile platform up -d --build
```

数据库端口只映射 `127.0.0.1`。元数据库使用 5432，测试源使用 5433，Redis 使用 6379，API 使用 3000。端口冲突时修改本地 Compose 配置。PostgreSQL 18 的持久卷挂载至 `/var/lib/postgresql`。本地开发账号具备初始化权限，不能用于生产运行账号；Compose 的口令环境变量也不能作为生产秘密管理方案。`docs/schema.sql` 不会自动装载，后续迁移必须使用独立迁移角色。

生产部署使用独立 Linux 执行主机与网络分区：控制平面、测试查询池、生产查询池、无网络构建沙箱、运行静态资源入口。测试与生产查询池采用不同主机身份、队列身份、Vault 路径及防火墙规则；不同 Redis DB 编号不足以形成边界。生产入口通过企业 TLS、OIDC 和反向代理接入，应用静态资源使用独立站点 origin。平台 API 无权创建容器，也不挂载 Docker socket。受信执行代理在专用执行主机创建 gVisor 沙箱或 microVM。

Compose 不是不可信代码的生产安全边界，也不提供跨主机高可用。生产上线前必须验证宿主防火墙、DNS 固定解析、TLS 证书、Vault 身份、对象存储访问策略、备份恢复和实际沙箱逃逸防护。镜像先经企业镜像仓库扫描，再以 digest 锁定；本地大版本镜像标签不代表生产可重复部署。

`Dockerfile.api` 是可读的开发容器构建路径，复用构建阶段依赖以便调试。正式发布阶段须生成仅含运行依赖的镜像、SBOM、签名和镜像摘要后再加入审批快照。当前机器没有 Docker 命令，交付验证使用 YAML 静态校验、Node 构建及 PGlite DDL 检查；Docker 构建及网络隔离实测仍是后续环境验收项。
