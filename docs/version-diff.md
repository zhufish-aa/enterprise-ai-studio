# 版本文件差异

在「我的应用 → 版本记录」中，具有应用开发权限和当前应用 developer/maintainer 成员资格的用户可查看逐行差异。默认比较当前所选版本与上一版本；首版与空版本比较。可以分别选择任意原版本、目标版本，或将原版本设为空版本。

- 左侧列出新增/修改/删除文件以及增删行数，支持文件名筛选。
- 右侧支持统一/并排视图；手机首次进入默认统一视图。新增绿色、删除红色，并用 +/− 标记，不仅依赖颜色。
- 未改内容只保留变更附近上下文，可逐段展开。大文件按批显示，点击继续显示不会丢弃源码。
- 文件末尾无换行、CRLF/LF 变化保留。空文件新增/删除有专门状态。
- 同版本或相同源码显示无变化；切换应用/版本时清除旧结果，失败可重试。
- studio.manifest.json 是不可变版本清单的格式化视图，不是额外保存的源码文件。
- 当前源码模型只接受文本，本次未增加图片/二进制上传或预览。

## 性能与授权

整个快照共享最多 100 万 LCS 计算单元；大变更回退为明确标注的整段替换。统计代表所展示的增删行，不保证最小编辑行数。只对选中文件保留逐行结构，首次渲染最多 800 行；后续分批展开。

新增只读 `GET /apps/{appId}/versions/{appVersionId}/source` 返回既有 `SourceUpload` 结构。要求当前 app.develop 权限、应用开发/维护成员以及当前 TEST 数据授权，拒绝跨组织/跨应用/撤权访问。源制品必须 sealed 且摘要一致。响应 no-store，读取审计仅存应用及版本 ID；不会恢复旧版本到草稿，不修改历史或创建构建/发布。

## 本次验证

基线：`19b0913b4ec3278e52a29367797d4238ea386f1f`。

通过：
- 11 项算法单元测试 + 3 项快照服务单元测试。
- platform-web 及其依赖构建/TypeScript 检查；platform-api 及其依赖构建/TypeScript 检查。
- OpenAPI 生成与一致性检查（162 operations），工作区依赖边界检查，改动文件 Prettier 与 git diff whitespace 检查。
- 独立静态复核；1000 文件、每文件 998 行全替换的只统计对比约 173ms（当前测试机 Node，非浏览器性能保证）。

未通过或受阻，不能视为端到端验收：
- `pnpm check` 在既有 deliverables 校验停止：脚本硬编码149个接口，基线已有161个，本次新增后162个。未在本需求中扩大修改旧校验。
- 全仓冻结安装被 registry.npmjs.org 的 tmp-0.2.7.tgz HTTP403阻断；未换镜像绕过。后续仅安装不含该包的 web/API 相关工作区，保持锁文件未改且禁用安装脚本。
- 真实PG集成测试已编写并尝试，PG18.4 initdb因缺少 libicuuc.so.60 未启动，用例未进入执行。
- Chromium UI验证在浏览器启动阶段遇到 socket() Operation not permitted，正式提权尝试仍失败；未完成真实视觉、手机交互和完整登录链验收。

在具备依赖的环境建议执行：

```sh
pnpm install --frozen-lockfile
pnpm contract:check
pnpm --filter @eas/platform-web... build
pnpm --filter @eas/platform-api... build
node --test tests/source-diff.test.mjs tests/version-source.unit.test.mjs
node --test tests/version-source.integration.test.mjs
pnpm check
```

浏览器验收重点：版本列表晚到、版本tab内切换应用、快速切换两个版本、拒绝授权后清除源码/重试、首次/空/相同版本、新增与删除空文件、上下文展开、大文件继续显示、手机默认统一视图。真实 Harness 宿主验收不在本次已完成范围内。
