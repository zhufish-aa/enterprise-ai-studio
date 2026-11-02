# Harness 0.2.1-rc.3兼容更新

日期：2026-10-26。插件：@eas/harness-plugin 0.2.5。

## 原因与修改

旧插件0.2.4的engines.dsh精确声明为0.2.1-rc.2。桌面升级到rc.3后，宿主在启动前按版本范围拒绝旧包。旧包的多个宿主peer依赖也固定在rc.2，因此需要同时更新开发依赖、宿主peer和兼容声明。

- 开发用的全部@deepseek-ai/dsh-*类型依赖统一锁定官方0.2.1-rc.3，提交pnpm-lock.yaml。
- engines.dsh及宿主peer明确声明 `0.2.1-rc.2 || 0.2.1-rc.3`。这两个版本经过相关源码接口对比；没有笼统声明未知未来版本都兼容。
- 插件版本升至0.2.5，重新编译Host和Client并打包。保留工具、服务器工作区、站点面板、数据集选择、Skill和官方图片附件集成。
- 不使用兼容性豁免，不修改Harness核心、用户会话或业务数据库。

## 实际依据

本机桌面自带CLI位于D:/新建文件夹 (3)/resources/runtime/cli/bin/dsh.cmd，--version返回0.2.1-rc.3。重新读取当前resources/app.asar索引，确认desktop-host、tools、skill、attachment、client-connection、client-modules、ui-sidebar、ui-conversation与ui-layout均为rc.3；Cordis4.0.5及Schemastery3.18.5保持不变。该结果不是沿用旧的asar缓存。

官方源码固定：

- rc.2：687f282e8625c6b8d11ff58211a90524be2e4317。
- [rc.3](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.3)：1f81c047fc48fa190a683e469daa699857e9afe8。
- [工具契约](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/docs/cookbook/adding-a-tool.md)、[官方tool-bash示例](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/packages/shell/tool-bash/src/index.ts)、[安装和engines规则](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.3/docs/user/develop/basic/publish.md)。

对比结果：tools、skill、attachment、client connection/modules、workspace controller等相关src接口未发生变更。客户端sidebar及conversation扩展新增更多菜单和pin接口，保留本插件使用的sidebar.panellist、main、conversation.hero.options、conversation.session.header.actions。workspace新会话调整了草稿复用，仍保留clearPreviousDraft兼容参数；本插件继续保留用户原有草稿，不引入覆盖操作。

## 安装与配置

使用桌面自带官方CLI更新desktop profile中的包，无需先删除插件或清空配置：

```powershell
& 'D:\新建文件夹 (3)\resources\runtime\cli\bin\dsh.cmd' plugin --profile desktop add C:/absolute/path/eas-harness-plugin-0.2.5.tgz --ignore-scripts
```

更新后重启Harness以加载新包；如果宿主提供重新加载插件入口，也可由用户使用。服务器地址、组织、工作目录和Token文件配置保持原值。安装后核对cordis.yml、cordis.patch.yml、sites-settings.json与加密Token文件，四份文件指纹均未改变，随包Skill与仓库源码一致。检查结果写入outputs/harness-rc3，不输出配置值或Token。

安装器还发现该profile已有官方@deepseek-ai/dsh-subagent-codex 0.2.1-rc.2，其rc.2 peer要求同样会阻止rc.3 profile启动。因此同时通过官方CLI更新为0.2.1-rc.3，依据官方tag中的packages/subagent/subagent-codex（该版本src与patch无变更，宿主peer统一为rc.3）。其余已安装依赖未改变，没有添加兼容性豁免。两次安装日志和最终安装元数据分别保留。

## 验证范围

执行依赖安装、pnpm install --frozen-lockfile、插件Host/Client编译、打包和官方CLI安装，并读取安装包元数据确认版本与兼容范围。按用户既有要求，不运行自动化测试、真实Harness加载/工具调用、截图、查询或浏览器验收。源码对比、编译与安装不能替代宿主运行验收。

旧rc.2兼容声明依据已有实现及rc.2/rc.3接口对比，本次只针对rc.3类型编译，未重新运行rc.2宿主。未来DSH版本仍需按实际接口更新；不通过删除engines或忽略依赖冲突伪装兼容。
