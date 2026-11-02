# 服务器文件工具顺序

全部工具返回 {ok:true,data:...} 或 {ok:false,error:{code}}。只采用真实返回的资源ID和 revision，错误不能当成功。

1. enterprise_connection_status；dataset_selected → datasource_list / dataset_list → dataset_schema，确认 TEST 业务语义。
2. 新项目 enterprise_app_create({key,name,type,description,datasetRefs,workspaceId:"server"})；已有项目 app_get / app_versions，沿用 appId。
3. enterprise_workspace_list({appId}) → data.revision、data.files。没有草稿时返回0；旧版本可 checkout({appId,revision,versionId}) 载入。
4. enterprise_workspace_write({appId,revision,files:[{path:"src/main.tsx",content:"完整源码"},...]}) 创建/覆盖；read({appId,path}) 读取；edit({appId,revision,path,oldText,newText,replaceAll:false}) 精确修改。每次使用最新revision。
5. move({appId,revision,from,to})；remove({appId,revision,paths})。只改草稿，历史版本不变。不能传本地/系统绝对路径。
6. enterprise_workspace_commit({appId,revision,message}) → data.version.id、data.version.sourceDigest、data.workspace.revision。不调用本地上传，不依赖会话文件权限/目录。
7. enterprise_build({versionId}) → data.id；enterprise_deployment_status({buildId}) 读取真实状态与安全日志。等待有上限，不无限重试。
8. 仅 succeeded 后 enterprise_preview({appId,versionId}) → data.previewUrl。预览需要访问者自己的平台身份和数据权限。
9. 反馈修改从同一 appId 的 workspace_read/edit 开始，再commit/build/preview；不要重建应用或覆盖历史版本。

WORKSPACE_REVISION_CONFLICT：其他操作已更新草稿，重新list/read并合并。WORKSPACE_EDIT_CONFLICT：oldText未匹配或不唯一，读取文件后精确选择。WORKSPACE_PROJECT_INCOMPLETE：缺src/main.tsx或studio.manifest.json。WORKSPACE_MANIFEST_INVALID：修复JSON。SOURCE_IMPORT_REJECTED：改用固定支持的包。

文件名与内容受当前编译格式约束：src下ts/tsx/css、studio.manifest.json、package.json、README.md；最多200文件、单文件128KiB、合计512KiB。后台不执行上传脚本。可选report_create/update不是源码站点开发必经步骤。
