# ADR-0004：契约同源与 Monorepo

日期：2026-10-22 · 状态：Accepted

## 背景

管理端、运行端、Harness 与独立 worker 同时依赖资源与任务语义。手写多套 DTO 容易使权限字段、错误码和命名漂移。

## 决策

采用 pnpm workspace、Node.js 24 和 TypeScript strict。OpenAPI 3.1.1 JSON 为唯一公开 REST 契约源，生成 TypeScript，检查操作 ID、幂等声明和生成类型新鲜度。shared 仅无副作用类型；contract 不引用实现。SQL snake_case、API camelCase，显式仓储映射。SQL 为版本迁移基线，阶段00参考 DDL 在 PGlite 执行验证。

## 替代与后果

多仓库能独立发版但增加协调成本；代码装饰器生成 OpenAPI 容易把未审阅的实现当契约；GraphQL 动态选择字段扩大生产审批和成本控制难度。契约先行要求额外运行时 schema 校验，生成类型本身不提供安全验证。未来大规模构建再引入 Nx/Turborepo。

## 验证

全新目录 frozen-lockfile 安装和 pnpm check；生成结果必须与源契约一致。真实 PostgreSQL 角色/RLS 与并发事务测试仍需后续集成环境。
