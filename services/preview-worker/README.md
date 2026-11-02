# Preview browser worker

独立 Chromium 调试服务，接收控制面签名的固定 TEST 版本预览；无数据库或平台用户 Token。提供页面交互、控制台、异常、DOM/样式检查、浏览器内 JS 求值、真实 PNG 截图。查询通过控制面原用户的安全网关，未替换成静态数据。

安装：pnpm --filter @eas/preview-worker browser:install。构建：pnpm --filter @eas/preview-worker build。启动配置和真实验收范围见 ../../docs/remote-debugging.md。企业跨机需要 mTLS；本地显式开发模式可用回环 HTTP。未通过关闭 Chromium 沙箱解决启动问题。

浏览器会话及日志是临时状态；应用源码、不可变版本和平台查询审计仍由原后端维护。本次按照用户要求未进行浏览器或 Harness 验收。
