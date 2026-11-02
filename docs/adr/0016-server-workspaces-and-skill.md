# ADR0016：服务器项目工作区作为默认AI开发方式

状态：Accepted。用户明确要求服务器文件编辑，取消依赖本地工作区上传的默认链路。

app_workspaces 与 app_workspace_files 保存服务端可变草稿，按组织和应用隔离。工具提供list/read/write/edit/move/remove/checkout/commit；网页提供相同服务器源码编辑页。当前选择PostgreSQL文本文件存储，便于多实例一致性、事务CAS和备份，不暴露主机文件系统路径。未来可迁移到有租户隔离的对象或工作区服务，保持API语义。

修改使用revision比较交换和原子事务，提交复用现有源码校验及不可变版本服务。草稿可变与版本不可变并存，checkout不改历史。每次资源权限在响应回放前重查。构建继续使用现有固定编译能力，不执行服务器Shell或上传脚本。

插件0.1.5使用实际固定官方版本的ctx.skills.registerProvider，随包发布enterprise-sites Skill与资源。参考官方skill-badge/skill-office实现，resourceBase对应安装包内目录，Cordis管理卸载。模型和用户调用均启用；官方tool-skill消费目录和正文。Schema来自唯一OpenAPI，无自创宿主接口。

按用户明确要求，本地导入取消固定workspaceRoot白名单和插件额外allowed-once确认；root只是可选默认文件夹。服务器工具不读取本地工作区。真实Harness宿主验收由用户完成，不能从编译/安装推断已加载。
