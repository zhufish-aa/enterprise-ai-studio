# 阶段04：报表、源码版本与真实测试预览

本阶段按最后确认的架构实现：Harness 的 AI 理解需求、读取授权语义并编写完整 React 源码；平台不调用模型生成代码，不把报表 JSON 当作换取固定页面的唯一协议。可选的 ReportDefinition 是业务语义与查询快照，通用 ReportView 是可以选用的组件库，SITE 和自定义 REPORT 页面都可以不用它。

## 实际可用能力

- 创建 REPORT / SITE 应用，当前应用成员实时鉴权，创建者成为 maintainer。
- 上传真实源码文件；应用版本、源码制品、报表定义与查询绑定均追加保存。SHA-256 按封存内容字节计算。
- 固定 `react-static-v1` 编译配置，由独立 HTTP worker 编译 React/TS/CSS。没有项目 shell、npm install、生命周期脚本、Vite 配置或自定义构建命令执行入口。
- 受信门户中的 opaque sandbox iframe 展示真实编译产物。生成应用没有平台 Token、数据库连接或网络查询权限。
- 日期与区域筛选 → 版本内的 queryKey → 当前访问用户 → 阶段03 TEST 网关 → 实际 PostgreSQL 数据。
- 指标卡、表格、柱、线、饼、排名，独立加载/失败/空数据状态；布局可跨12列，手动或至少60秒刷新。
- 源码版本历史、变更文件摘要、从历史版本创建新草稿；可选报表定义的版本保存与恢复。恢复不自动构建或发布。
- 自然语言编辑入口生成带当前应用/版本的 Harness 开发指令。门户复制指令不会假装已调用一个模型。
- 审批入口明确显示未启用；没有审批、发布或生产授权签发接口。

## 启动与业务操作

~~~sh
pnpm install --frozen-lockfile
pnpm check
pnpm dev:local
~~~

打开 http://127.0.0.1:5173 ，以 `work/local-access.json` 的 developer Token 登录。默认“我的应用”中打开“销售经营分析”。令牌只在当前受信页面内存中使用。演示启动真实原生 PG18.4、API、独立查询 connector、独立编译 worker 和 Vite；进程停止后临时集群不保留业务状态。

1. 业务人员选择授权数据集，描述需求，复制给已配置插件的 Harness。
2. Harness 获取语义定义，遇到不存在的字段或口径不明先澄清；不编造“净利润”等未定义指标。
3. Harness 在当前工作区编写源码及 `studio.manifest.json`，使用 runtime SDK 查询 queryKey。
4. 调用应用创建、源码上传、构建与预览工具。上传时通过宿主 ApprovalService 获取一次确认。
5. 在门户查看实际数据；修改需求继续原应用/原工作区，追加源码版本。
6. “版本记录”可恢复旧版本为新草稿；“报表定义”可保存业务配置快照。定义变化后必须同步到源码并提交新应用版本，才改变该源码版本的页面行为。

开发示例真实源码在启动后生成到 `work/sales-analysis/src/main.tsx`；同目录 manifest 包含本次集群实际数据集 ID。不要把其他临时集群生成的 manifest 混入当前集群。

## 版本化配置

权威定义为 `packages/api-contract/openapi.json#/components/schemas/ReportDefinition`。独立文件 `packages/api-contract/report.schema.json` 和插件参数 Schema 都由 `pnpm contract:generate` 同步生成。禁止手工改变生成类型。

| 配置 | 约束与用途 |
| --- | --- |
| schemaVersion | 目前仅 `1.0`；未知版本拒绝，不隐式猜测迁移 |
| reportId / title | 真实报表资源及标题，Report 归属必须和 App 一致 |
| datasetRefs | 显式 datasetId + 不可变 datasetVersionId，最多10项 |
| metrics / dimensions | 引用查询中存在的语义键；指标口径来自 Catalog |
| filters | dateRange / select，字段引用受校验，不接受函数或 SQL |
| queries | 最多12个唯一 queryKey，每个是阶段03 QuerySpec |
| chartDefinitions | 最多20图，类型、queryKey、维度、值列、格式和跨度；图表 ID 唯一 |
| layout / theme | 12列、16/20/24间距；studio-light / studio-dark，无脚本 |
| refreshPolicy | manual / interval，60–3600秒 |
| notes | 未确定含义、统计口径、限制说明的文本；无 HTML 执行 |

新增 Schema 版本时先写显式纯迁移函数和金样例，保留旧版本原文、来源和摘要，再通过新版本保存；不得就地改写历史。当前没有已发布的 v2 迁移器，不能提交 v2 配置。

服务端同时校验 JSON Schema、数据集/字段/指标授权、行策略、queryKey 与 DatasetRef 一致、图表数据列和报表归属。可选 report 配置必须先保存为实际 ReportVersion，源码版本绑定相同摘要的 ReportVersion 和 queryKey 快照。

## 源码协议与 SDK

源码上传 `POST /apps/{appId}/versions` 接收 `SourceUpload`：manifest、文件数组、提交说明。这个 REST API 接收实际文件字节的 JSON 表达；插件从工作区自动采集，不要求模型把整个源码写进工具参数。512KiB总源码、200文件、每文件128KiB；只接收 `src/**/*.ts(x)`、CSS、package.json、README.md。manifest 独立作为受校验的协议字段；不接受压缩包解压路径。

~~~ts
import {query} from '@eas/platform-sdk/runtime';
const result = await query('trend', [
  {fieldKey: 'region', operator: 'eq', value: '华东'},
], {fieldKey: 'order_date', from: '2026-09-24T00:00:00Z', to: '2026-10-24T00:00:00Z'}, signal);
~~~

页面不能传 API 地址、SQL、environment、凭据或任意 HTTP 方法。受信壳检查 `event.source`、opaque origin、请求 ID、版本绑定和并发；后端从不可变 manifest 找 queryKey，追加过滤条件后交给网关。时间字段必须等于绑定查询的时间字段。最终授权以当前浏览者为准，不能借创建者权限。

`@eas/platform-sdk` 的控制面客户端统一类型、Token 回调、超时、AbortSignal、幂等键、安全错误与重定向拒绝。独立声明式测试运行端 `apps/report-runtime` 复用同一 ReportView，需部署 `/v1` 反向代理；本地设置 `VITE_API_PROXY` 后在5174启动。正式生产运行端尚未启用。

## 真实销售数据库

`scripts/sales-fixture.mjs` 创建独立 `studio_sales_test`，含 orders、customers、products、regions。批准的 `erp.sales_analysis` 视图由 IT 关联四表；只读账号仅能 SELECT 这个视图，AI 不提交 JOIN。

固定统计日2026-10-23，最近30天为2026-09-24到2026-10-23（右开端点次日零点）。60笔 paid 订单，另有一笔 pending9999元和一笔范围外8888元，均不得进入默认统计。

| 统计项 | 确定预期 |
| --- | ---: |
| 已支付销售额 | 47,040元 |
| 已支付订单数 | 60 |
| 华南 | 12,624元 |
| 华北 | 11,984元 |
| 华东 | 11,536元 |
| 西南 | 10,896元 |
| 企业服务 | 27,200元 |
| 智能终端 | 16,000元 |
| 办公设备 | 3,840元 |

日期类型以日历字符串返回，不经本地午夜 Date 转换；测试对首尾日期作精确断言。区域华东筛选应返回11,536元和15笔，所有图表随之改变。无数据时趋势/排名等显示空态；汇总 COUNT 为0，SUM 为 null 时卡片显示0。

## 当前边界

编译器只解析和打包，不加载生成模块到 Node。但 esbuild 仍处理不可信输入，独立进程不是内核隔离沙箱。开发机没有Docker/gVisor/microVM，未验证恶意代码逃逸、进程CPU/内存硬限制或企业构建主机网络隔离。所有当前制品均 `preview_only=true`，生产查询授权消费者拒绝它们；不能将本地编译成功解释为生产构建/漏洞扫描/签名验收通过。

首版不接受图片/字体文件、任意第三方包、用户 Node 后端、任意构建脚本、跨库 JOIN、通用 Sites 写操作。源码允许包仅 React19.3.1、ReactDOM、ECharts6.1.0、平台 runtime SDK 和 ReportView；上传的 package.json 不决定服务器安装依赖。完整依赖扫描、SBOM、签名、对象存储、审批、生产发布、协作成员管理与部署回滚留给阶段06/07。


## 站点分享与访问令牌

已接通私有/组织内链接公开、固定TEST版本、复制/访问与访客身份网关；网页左下角个人访问令牌可创建开发凭据并撤销。原生站点页新增人工源码上传用于会话禁用审批时的用户主动操作；AI上传仍服从宿主拒绝。完整步骤和限制见site-sharing-and-tokens.md。
