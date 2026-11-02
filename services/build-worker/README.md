# 固定 React 编译 worker

无BUILD_WORKER_KEY时入口仍输出禁用capability退出。显式配置后提供签名POST /compile，仅接受react-static-v1及有界源码文件；不运行上传代码、不读取项目配置、不执行npm或Shell。API与编译器分进程，通过HMAC和非本地mTLS调用。测试仅显式允许loopback HTTP；企业部署仍须专用隔离账户与网络。

本阶段已真实编译React19.3.1/ECharts6.1.0项目，产物经gzip传回API保存；无自定义依赖、图片资产、Node后端或构建命令。源码namespace只解析提交文件与固定包，node:fs/绝对路径/未知包被拒绝。编译错误只返回有限代码，不输出源码和宿主路径。

API中的构建任务有持久状态、一次40秒租约和30秒请求预算，宕机过期标记失败，旧响应不能覆盖新状态；最多4个排队/运行任务，调度器单并发。固定profile检查不代表完成漏洞扫描或签名，所有产物preview_only=true；生产查询消费者拒绝它们。

没有创建容器或内核沙箱，进程超时不是恶意输入CPU/内存硬配额。后续必须部署专用Linux执行主机、gVisor/microVM、无网络与资源限制，接入依赖扫描/SBOM和签名。worker不应获得元数据库、Vault或业务库访问；当前本机与API同一OS用户运行仅供合成数据TEST验证。平台API无容器管理权限。
