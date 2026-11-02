# Enterprise AI Studio · Harness 插件

DeepSeek Harness 的企业站点与数据集插件。AI 在服务器工作区编写和修改 React 代码，平台负责版本、构建、测试预览和上线申请。

## 安装

使用 DeepSeek Harness 自带的 `dsh` 命令：

```sh
dsh plugin --profile desktop add @zhujunjie12/harness-plugin@0.3.0 --ignore-scripts
```

安装或更新后重启 Harness。在“站点 → 服务器设置”填写平台 API 地址、Web 门户地址和个人访问令牌。平台 API 与门户共用入口时，两处填写同一地址。组织由后台自动识别，无需填写组织 ID。

本版本兼容 DSH `0.2.1-rc.2`、`0.2.1-rc.3`，使用 Cordis `4.0.5` 和 Node.js 24。真实 Harness 宿主使用效果由用户验证。

## 功能

- 原生站点入口、应用与源码版本管理。
- 会话中选择授权 TEST 数据集，读取字段和业务指标。
- 直接创建、读取、修改服务器工作区文件，提交不可变版本。
- 固定构建、测试预览、构建状态和错误诊断。
- 远程页面交互、控制台与异常、DOM 检查及真实截图。
- 准备和提交上线申请，查看申请状态；审批由负责人操作。
- 内置 `enterprise-sites` Skill，指导 AI 开发、查询、构建和调试。

令牌保存在本机凭据文件，Windows 使用当前用户 DPAPI 加密。插件通过平台 API 查询数据，不读取数据库密码，不提供任意 SQL 或服务器 Shell。

插件需要已部署的 Enterprise AI Studio 后端；npm 安装包仅包含插件、前端扩展、接口 Schema 和 Skill，不包含平台数据库、账号令牌或服务器密钥。

支持完整站点工作区：src/ 前端、server/ 独立 Node.js 24 后端、shared/ 共享模型、db/ 数据库迁移。新增本站数据源、连接检查、后端部署、日志与原 TEST 链接版本更新工具。源码保留正常缩进与换行，压缩只用于构建产物。
