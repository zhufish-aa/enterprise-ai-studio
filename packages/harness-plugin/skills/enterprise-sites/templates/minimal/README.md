# 最小服务器项目

按需读取本目录的 src/main.tsx、src/style.css、studio.manifest.json，然后用 enterprise_workspace_write 把内容写入目标应用的服务器草稿。无需本地项目目录或上传工具。

manifest中的两个UUID和sales_total/region是格式示例；必须先查询授权元数据并替换，页面列key同步修改。此模板不含企业数据、Token或数据库密码，也不是完整销售报表。按用户需求扩展真实查询与筛选。

无数据SITE可使用空datasetRefs/queries，自己编写页面；不要伪造企业数据。写完commit得到version，再build/status/preview。
