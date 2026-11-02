# Connector transport

受信内部服务传输：规范化JSON摘要、HMAC签名绑定method/path/body/timestamp/nonce，30秒防重放；响应亦签名，拒绝重定向与超过2MiB响应。非本地fixture请求要求HTTPS双向TLS，rejectUnauthorized=true。每环境专用CA和独立共享密钥必须由部署提供；HMAC不能替代mTLS与路由隔离。

loadTls读取证书文件，signedRequest只调用受信部署配置中的URL，不能接收用户URL。本机HTTP例外只允许明确开关与127.0.0.1/::1，生产connector额外拒绝该例外。
