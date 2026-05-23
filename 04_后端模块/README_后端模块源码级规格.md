# 后端模块源码级规格 V3.4

## 推荐技术栈
NestJS + TypeScript + MySQL + Redis + Prisma/TypeORM，或 Spring Boot 等价实现。Codex 可按仓库已有技术栈执行；无仓库时默认 NestJS。

## 模块
1. auth：微信登录、mock 登录、JWT、roleContext。
2. admin-auth：后台登录、RBAC。
3. merchant：商户、商户老板绑定、审核、状态。
4. store：门店、二维码。
5. wifi：WiFi 配置、reward_token、连接信息、连接结果。
6. ad：广告、广告投放、AdProvider、mock 广告、微信广告参数。
7. revenue：收益生成、确认、作废、重算。
8. wallet：钱包、流水、人工调账、冻结/解冻。
9. withdraw：提现、TransferProvider、mock 转账、微信转账、回调、查单、对账。
10. ranking：榜单快照、刷新任务、展示规则。
11. risk：风控规则、事件、处理动作。
12. config：系统配置、配置字典、敏感配置读取。
13. operation-log：操作审计。
14. integration-status：第三方配置状态检测。

## Provider 接口
- AuthProvider: code2Session(code) -> openid。
- AdProvider: createView/start/verifyComplete。
- WifiProvider: getConnectInfo。
- TransferProvider: transfer/query。
- NotifyVerifier: verify/decrypt。

业务服务只能依赖 Provider 接口，不得直接写死微信实现。
