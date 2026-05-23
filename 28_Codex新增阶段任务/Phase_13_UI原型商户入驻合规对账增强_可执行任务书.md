# Phase 13 - UI 原型、商户自助入驻、合规提示、财务对账增强

## 输入文件
- 23_UI原型与组件库/README_UI原型解决方案.md
- 23_UI原型与组件库/小程序低保真原型.md
- 23_UI原型与组件库/PC后台低保真原型.md
- 24_商户自助入驻流程/merchant-onboarding.md
- 25_广告合规提示增强/miniapp-ad-compliance-copy.md
- 26_财务对账增强/finance-reconciliation-v3.4.md
- 27_测试用例增强/test-cases-v3.4.md
- 02_数据库/schema.sql
- 03_API接口/openapi.yaml

## 开发目标
1. 小程序 WiFi 首页增加右下角“商家申请/申请进度/商家中心”悬浮入口。
2. 实现商户自助申请表单、申请进度页、后端申请 API。
3. 实现后台商户申请审核页。
4. 审核通过后自动创建商户、门店、老板绑定和可选 WiFi。
5. 补齐广告合规提示文案。
6. 实现财务对账页面和 mock 对账任务。
7. 根据 UI 原型优化小程序和后台页面布局。

## 禁止事项
- 不得让普通客户默认进入商家页面。
- 不得要求真实微信手机号授权才能开发；必须支持 mock/manual 手机号。
- 不得要求真实 WiFi、广告位、支付参数才能开发。
- 不得删除原有商户收益、提现、排行榜功能。

## 验收标准
- 普通客户扫码后 3 秒内可理解如何连接 WiFi。
- 商家申请入口存在但不干扰 WiFi 主按钮。
- 申请提交、后台审核、自动开通商家中心全流程可用。
- WiFi 信息可在申请时选填，也可审核通过后后台补填。
- 财务对账至少支持 5 类 mock 差异。
- 所有新增接口有权限测试和 e2e 测试。

## Commit message
`feat(v3.4): add merchant self onboarding ui prototype compliance and reconciliation enhancement`
