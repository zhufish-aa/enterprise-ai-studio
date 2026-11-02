# 服务器项目的 AI 远程调试

2026-10-24，插件 0.2.4。Harness 继续负责生成和修改代码。新增独立 preview-worker 运行 Chromium，插件通过平台 API 控制该浏览器，读取真实 TEST 版本的页面、查询、错误和截图。控制面不运行应用 JavaScript，也没有增加第二个 AI Agent。

## 使用方式

先安装更新后的插件、重启 Harness。在原应用会话中可直接要求：“打开这个版本远程调试，复现日期筛选问题，读取控制台并截图，修复后提交新版本。”随包 enterprise-sites Skill 已说明操作顺序。

| 工具 | 功能 |
| --- | --- |
| enterprise_debug_open | appId、versionId 和可选 viewport；绑定指定成功构建，异步打开浏览器 |
| enterprise_debug_status | ready/starting/failed/closed、控制台、异常堆栈、查询耗时/行数/Trace ID、操作结果和待完成数量 |
| enterprise_debug_action | 页面交互、DOM/无障碍/计算样式检查、浏览器控制台求值、刷新和窗口尺寸 |
| enterprise_debug_screenshot | 真实 PNG 图片附件，支持全页、当前视口、指定元素 |
| enterprise_debug_close | 结束浏览器及当前待完成查询；不影响源文件和版本 |

动作使用结构化参数。例如：

```json
{"sessionId":"会话 UUID","action":{"type":"click","selector":"text=近 90 天"}}
```

支持 click、hover、fill、select、press、check、scroll、resize、inspect、wait、reload、key_down、key_up、mouse、evaluate。selector 使用 Playwright 选择器，作用于应用 iframe；不选择管理门户。先 inspect 获取实际 DOM 和无障碍结构，再定位元素。mouse 的 event 为 move/click/down/up，x/y 是视口坐标；游戏可连续 key_down/key_up。

evaluate 的 expression 在应用的浏览器 frame 中执行，返回可 JSON 序列化的结果；可检查状态、Performance API、布局溢出，或执行浏览器侧断言。它不是服务器 Node.js、Shell 或文件工具。代码修改继续使用 workspace 工具。

open/actions 返回 202 表示已接收。AI 需读取 status，确认 ready，等待 pendingActions 和 pendingQueries 完成，并结合 DOM 中的实际数值判断页面是否就绪。截图响应带 appId、versionId、sessionId、时间和未完成查询数；加载截图不能冒充完成结果。新版本重新 open，避免用旧浏览器验证新代码。

截图在服务器通过 [Playwright 官方截图 API](https://playwright.dev/docs/screenshots) 产生，插件使用目标 Harness 已安装的 AttachmentStore.saveImage 和 ToolOutputDefinition.render 返回官方 image 附件。不会把 PNG base64 文本塞给模型冒充视觉能力。若模型不支持图像，仍保留附件，AI 应明确说明视觉未核验，可用 DOM/样式/日志继续定位。

## 服务和接口

服务源码位于 services/preview-worker；只依赖共享契约、工作负载签名传输和 Playwright，不导入控制面实现。使用独立浏览器上下文，默认 1440×900。浏览器安装和构建：

```sh
pnpm install --frozen-lockfile
pnpm --filter @eas/preview-worker browser:install
pnpm --filter @eas/preview-worker build
```

本地启动脚本已接入新服务；pnpm dev:local 仍会初始化一套新临时环境，不用于覆盖现有项目。当前保留既有数据库的运行脚本也已接入 preview-worker。

独立部署时设置 PREVIEW_WORKER_PORT、PREVIEW_WORKER_KEY，API 设置 PREVIEW_WORKER_URL、PREVIEW_WORKER_KEY。密钥应通过部署秘密管理注入，不能传给插件或页面。企业跨机使用 PREVIEW_TLS_CERT/KEY/CA 与 API 的 PREVIEW_CLIENT_TLS_CERT/KEY/CA；只有 development/test 且 PREVIEW_ALLOW_LOCAL=true 可用本机 HTTP。可用 PREVIEW_BROWSER_EXECUTABLE 指向运维安装的 Chromium。Chromium 沙箱保持启用。

OpenAPI 是唯一契约源，新增接口：

| 方法与路径 | 权限与结果 |
| --- | --- |
| POST /apps/{appId}/debug-sessions | app.develop、当前维护成员；StudioDebugOpen → StudioDebugSession |
| GET /debug-sessions/{debugSessionId} | 当前会话所有者及实时应用/数据权限；状态、日志和 observation |
| POST /debug-sessions/{debugSessionId}/actions | 相同权限，幂等操作；StudioDebugAction → 已接收状态 |
| GET /debug-sessions/{debugSessionId}/screenshot | 相同权限，fullPage/selector；StudioDebugScreenshot |
| POST /debug-sessions/{debugSessionId}/close | 相同权限，幂等关闭 |

SDK 提供 openDebug/debugSession/debugAction/debugScreenshot/closeDebug。会话创建和动作沿用 Idempotency-Key、audit_logs 与 outbox；真实查询沿用原 query_jobs/query_audits，并记录应用和相同 Trace ID。调试日志和截图属于临时运行状态，不写入业务版本。API/worker 重启后重新打开会话。API运行期间保持打开的会话，结束时由AI调用close；已关闭/失败的会话记录空闲30分钟后清理。worker 在失去控制面通信后默认30分钟清理遗留浏览器，PREVIEW_IDLE_MS可由运维配置。

## 数据与执行边界

API 按当前会话所有者、组织、应用维护成员和数据权限检查打开、操作、读日志及截图。委托保存的是服务端 Actor 元数据，包括个人令牌/网页会话引用；不保存或传递原始 Token。权限撤销或令牌失效时停止后台数据桥接，不能继续读缓存截图。不同用户不能读取彼此调试会话。

实际构建 HTML 仍运行于 opaque iframe，使用与门户相同的 runtime SDK 和固定查询绑定。浏览器里的 queryKey/筛选由控制面按原用户权限创建真实 TEST 查询；结果和失败通过受信壳返回。没有生产环境/数据库地址/凭据参数，也不把数据集查询改成 Mock。长查询继续发送 pending 心跳；页面取消时取消对应查询。

浏览器使用固定 loopback 虚拟壳地址，由路由直接 fulfill，保留 crypto.randomUUID 等 Secure Context 能力；不实际连接该地址。只有该固定主框架导航被 fulfill，其他网络与 WebSocket 均阻断；保留产物原 CSP。插件不传任意 URL 或服务器命令，浏览器无平台 Cookie/Token、数据库凭据、源码工作目录挂载。evaluate 只获得页面 JavaScript 已有能力。

控制台和截图可能包含调用者获授权的测试业务数据，应按企业政策保管。审计仅记录资源、动作和 Trace；不记录截图、查询结果或控制台内容到通用服务日志。

## 当前实际验证范围

已安装 Playwright 1.64.1 和对应 Chromium；已接入 API、SDK、官方 Harness 图片附件协议、工具和 Skill。构建失败现在也返回源文件、行列和编译器原因，保存于已有构建日志。

按用户要求，本次只安装依赖、生成契约、编译和启动服务，未运行自动化测试、浏览器调试会话、截图验收或真实 Harness 工具调用；因此不声称远程调试端到端已经通过。视觉、真实数据、交互、授权撤销、跨用户隔离与浏览器中断均待用户验收。

这是浏览器端调试环境，尚不是完整服务器 IDE：没有任意服务端包安装/命令执行、Node 进程断点或通用后端沙箱；不包含生产数据调试。当前运行时堆栈指向构建 JS，尚无原始 TS/TSX sourcemap 映射；构建语法错误提供原文件行列。内核级浏览器隔离、企业 PKI、恶意页面资源耗尽、长期截图归档和重启恢复仍需部署环境完善与验收。
