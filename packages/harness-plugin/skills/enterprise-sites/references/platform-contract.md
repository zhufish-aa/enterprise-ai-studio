# 实际查询与源码契约

查询必须使用授权元数据的稳定 key。以下 UUID/指标/字段仅说明格式，复制前必须用 schema 工具核实并替换，不是可执行的企业语义。

```json
{
  "schemaVersion": "1.0",
  "entrypoint": "src/main.tsx",
  "datasetRefs": [{"datasetId":"00000000-0000-4000-8000-000000000001","datasetVersionId":"00000000-0000-4000-8000-000000000002"}],
  "queries": [{"key":"sales_by_region","query":{
    "datasetId":"00000000-0000-4000-8000-000000000001",
    "datasetVersionId":"00000000-0000-4000-8000-000000000002",
    "metrics":["sales_total"],"dimensions":["region"],"filters":[],
    "groupBy":["region"],"orderBy":[{"key":"sales_total","direction":"desc"}],"limit":20
  }}]
}
```

必填数组 metrics、dimensions、filters、groupBy、orderBy 不能省略。metrics 是服务端已定义指标 key，不是 `SUM(amount)`。groupBy 与维度保持一致；无聚合明细查询用 metrics:[]、groupBy:[]。timeRange 是 `{fieldKey,from,to}`，from/to 为完整 ISO 日期时间；使用显式时区，from 包含、to 不包含，不能用“今天”“最近30天”等字符串代替。过滤项是 `{fieldKey,operator,value}`，不是 SQL 或函数，operator 仅 eq/ne/lt/lte/gt/gte/in/between。

iframe SDK：

```ts
import {query} from '@eas/platform-sdk/runtime';
const controller = new AbortController();
const result = await query('sales_by_region', [], undefined, controller.signal);
const regionIndex = result.columns.findIndex(column => column.key === 'region');
const valueIndex = result.columns.findIndex(column => column.key === 'sales_total');
if (regionIndex < 0 || valueIndex < 0) throw new Error('QUERY_COLUMNS_MISSING');
const chartData = result.rows.map(row => ({name:String(row[regionIndex] ?? ''),value:Number(row[valueIndex] ?? 0)}));
```

runtime 的 filters/timeRange 是受服务端校验的附加筛选，不能修改 manifest 以外的 datasetId、metrics 或任意查询。不要调用 SDK 控制面 Client，不保存身份 Token。查询与父门户以 postMessage 协议交换，运行代码不直接访问网络。筛选不能放宽固化查询或后端权限。

使用日期筛选的**每一个查询**都要在 manifest 的 query 中登记，例如 `"timeRange":{"fieldKey":"order_date","from":"2026-09-24T00:00:00+08:00","to":"2026-10-24T00:00:00+08:00"}`。运行时可改变 from/to，fieldKey 必须相同。未登记时返回 INVALID_FILTER_BINDING，并提供查询名和修正字段；登记并构建新的版本后生效。用于获取最早/最晚日期的无范围查询不要传 timeRange。日期示例必须按真实数据集字段与需求替换。

`query()` 抛出的 Error.message 包含具体原因、修复建议、错误码与可用的请求/追踪编号；直接在对应图表错误区显示，设置 white-space:pre-line。不要把所有错误都替换成权限不足。多图表可并发发起，门户和插件预览桥会限制实际并发并排队执行。

最小无数据站点的 manifest 可写 datasetRefs:[]、queries:[]；如果没有数据绑定，不要在页面中伪造企业图表。SourceManifest 的 report 属性是可选语义资源，不是生成源码的前提。

工作区上传：src 内仅 ts/tsx/css；根目录可带 package.json、README.md；studio.manifest.json 单独解析。最多200项、单文件128KiB、总计512KiB；隐藏文件、符号/硬链接、越界路径拒绝。不要把 node_modules、.env、账户密码、图片二进制或密钥放进源码。使用 CSS/内联 SVG 表达图标，固定构建不支持任意图片资源导入。
