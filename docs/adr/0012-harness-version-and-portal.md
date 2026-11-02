# ADR0012：固定实际 Harness API，使用官方工具与门户入口

状态：Accepted，阶段05。实际宿主验收由用户执行。

安装到真实桌面端时发现全局CLI与桌面运行时不同。插件0.1.2改为精确针对Desktop/tools/user-approval 0.2.1-rc.2、Cordis4.0.5，依据实际app.asar清单、自带CLI版本与官方tag dsh-v0.2.1-rc.2（687f282e8625c6b8d11ff58211a90524be2e4317）源码。显式补全类型依赖，不关闭strict peer检查。实现继续只依赖已确认的apply/inject、tools.register、agent.session.header.cwd及ApprovalService.request。使用安装自带CLI管理desktop profile，避免旧全局CLI替换或污染宿主。历史0.1.0只面向旧CLI。

原始OpenAPI Schema并不都属于该Harness版本的JSON Schema子集。工具向宿主投影结构，execute用完整Ajv规则校验，再由服务端执行资源授权。配置采用官方Schemastery，patch按id覆盖；敏感Token由工作区外DPAPI/权限文件提供，绝不作为工具参数。

当前已按固定版本源码实现原生UI：sidebar.panellist order5位于插件order0与自动化任务order10之间，main keyed panel为enterprise-sites；conversation.hero.options与conversation.session.header.actions注册TEST数据集选择器。新增站点通过workspaces.create和uiWorkspace.startSession预填自然语言草稿，保留既有草稿，不自动发送。Host使用connection.fetch.register精确POST路由，不占用Gateway唯一的/api拦截器。UI实际宿主交互验收由用户执行。SDK打包进独立tgz；宿主服务使用peer依赖，Cordis effect管理注册卸载。

一份插件配置绑定个人平台身份；共享多用户宿主的逐用户身份代理是未来扩展点。插件不会提供原始SQL、数据库连接、Shell或自主审批。release工具在阶段06之前返回明确disabled状态。用户已明确不要求本阶段执行插件测试，本交付不宣称加载或Agent端到端演示已通过。

0.1.5依据同tag的docs/subsystems/skills.zh.md和官方skill-badge/skill-office示例，增加ctx.skills.registerProvider随包企业Skill，resourceBase指向安装包内skills目录，官方tool-skill负责发现/加载。默认开发改为服务器文件工具，参见ADR0016；此前workspaceRoot/allowed-once描述作为历史实现保留，已由用户明确要求替换。
