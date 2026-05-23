# Phase 05 - 扫码广告rewardToken闭环 可执行任务书 V3.4

## 输入文件
- README_FOR_CODEX.md
- CODEX_MASTER_PROMPT_V3.4.md
- 01_总文档/00_源码级AI开发总文档_V3.4.md
- 03_API接口/openapi.yaml
- 06_PC后台/后台页面字段级规格.md
- 05_小程序端/小程序页面字段级规格.md
- 16_配置项完整字典/config-dictionary.yaml
- 17_佣金分成规则/commission-rules.md
- 18_WiFi配置规则/wifi-config-rules.md
- 19_钱包提现会计规则/wallet-withdraw-accounting.md

## 本阶段目标
开发 扫码广告rewardToken闭环 相关代码。不得跳阶段，不得删除商户佣金、提现、排行榜、WiFi 配置、Mock 模式。

## 必须使用的开发 skill
1. 需求读取 skill：先读取本阶段输入文件并列出任务清单。
2. 数据建模 skill：如涉及表结构，生成 migration/entity/dto。
3. API 契约 skill：按 openapi.yaml 生成 controller/service/request/response。
4. RBAC skill：所有后台接口加权限 guard。
5. 页面表单 skill：如涉及页面，按字段级规格生成搜索、表格、弹窗、校验、按钮权限。
6. Mock/Adapter skill：涉及微信/广告/WiFi/支付必须先实现 mock provider。
7. 测试 skill：生成单元测试、接口测试或页面基础测试。

## 禁止事项
- 不得要求用户提供微信 AppID、广告位、商户号、API v3 密钥、真实 WiFi 信息。
- 不得把真实密钥写入源码。
- 不得让前端决定余额。
- 不得绕过 wallet_ledger 修改钱包。
- 不得让普通客户看到商户收益页面。

## 完成标准
1. 本阶段涉及接口可运行。
2. 本阶段涉及页面可打开并显示空状态。
3. Mock 模式可通过基础测试。
4. 权限校验存在。
5. 操作日志在高危操作中存在。
6. 运行测试/构建。
7. git commit，格式：phase-05: 扫码广告rewardToken闭环
