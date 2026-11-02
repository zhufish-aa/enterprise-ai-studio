# AI 使用入口

插件随包注册 enterprise-sites Skill。先通过宿主 skill({name:"enterprise-sites"}) 加载完整指南。默认使用服务器文件编辑模式：发现授权TEST数据 → 创建/获取应用 → workspace_list/read/write/edit → workspace_commit → build/status/preview。修改同一应用的服务器草稿并追加版本，无需本地工作区。

真实项目模板、DSL/manifest schema和工具顺序均在skills/enterprise-sites。网页“我的应用 → 服务器源码”也可查看和编辑相同文件。旧的固定workspaceRoot上传限制和插件强制allowed-once确认已按用户要求移除；本地导入仅是可选功能。

示例：“选择ERP测试数据源，直接在服务器创建销售报表，显示最近30天趋势、区域排名、订单数和产品占比。然后改成横向排名，继续同一应用提交第二版。”

开发与预览固定TEST。需要正式上线时，通过enterprise_release_options获取可选审批人，由用户确定顺序，随enterprise_release_submit的approvalSteps提交，或直接打开门户申请表选人。实际审批和正式部署由负责人完成，AI不能代替审核。工具连接错误、口径不明或构建失败需明确说明，不能编造预览或审批结果。实际Harness宿主加载与Agent调用由用户验收。
