# 佣金分成规则 V3.4

## 基本原则
商户佣金 = 有效广告结算收入 × 生效分成比例。
所有收益必须经过广告有效性校验、结算确认、风控审核后，才可进入可提现金额。

## 分成比例单位
系统内统一使用 bps，10000 = 100%。默认商户 5000，平台 5000。

## 分成比例优先级
从高到低：
1. 门店特殊比例 stores.share_rate_bps
2. 商户特殊比例 merchants.share_rate_bps
3. 广告活动特殊比例 ad_campaigns.merchant_share_rate_bps
4. 系统默认比例 system_configs.default_merchant_share_rate_bps

注意：如果门店特殊比例为空，才使用商户比例；如果商户比例为空，才使用广告活动比例；如果都为空，使用系统默认比例。

## 修改入口
后台必须提供四个入口：
1. 系统配置 -> 分成配置：修改全局默认商户比例、平台比例。
2. 商户管理 -> 修改分成比例：修改商户级比例。
3. 门店管理 -> 修改分成比例：修改门店级比例。
4. 广告投放 -> 广告活动分成比例：可选，默认空。

## 修改权限
- 超级管理员：可修改全部比例。
- 财务主管：可修改商户级、门店级比例，但需二次确认。
- 运营：只读，不可修改。
- 商户老板：只读自己的当前分成比例，不可修改。

## 校验规则
- merchant_share_rate_bps 范围：0 到 10000。
- platform_share_rate_bps = 10000 - merchant_share_rate_bps。
- 默认禁止设置商户比例高于 8000，除非超管开启 allow_high_share_rate=true。
- 修改比例必须填写 reason。
- 修改比例必须二次确认。
- 修改比例必须写 operation_logs。

## 生效时间
- 默认 next_event 生效：修改后仅影响未来新产生的收益记录。
- 已生成 revenue_records 不自动重算。
- 如需重算，必须由超管在收益管理发起“人工重算”，生成 adjustment ledger，保留原始记录。

## 收益记录必须固化比例
revenue_records 创建时必须保存：
- applied_share_rate_bps
- merchant_amount_cent
- platform_amount_cent
- share_rule_source: store|merchant|campaign|global
- share_rule_ref_id

这样后续比例修改不会影响历史账。

## 示例
广告结算收入 100 元，门店比例 6000：
- 商户收益 60 元
- 平台收益 40 元
- revenue_records.applied_share_rate_bps=6000
