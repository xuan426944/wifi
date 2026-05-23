# 钱包提现会计规则 V3.4

## 钱包余额字段
merchant_wallets：
- total_confirmed_cent: 累计确认收益。
- available_cent: 可提现金额。
- frozen_withdraw_cent: 提现中冻结金额。
- frozen_risk_cent: 风控冻结金额。
- total_withdrawn_cent: 累计已提现金额。
- version: 乐观锁版本。

## 钱包流水原则
所有余额变化必须写 wallet_ledger。禁止直接 UPDATE 钱包余额而不写流水。

## ledger_type 枚举
- revenue_confirm: 收益确认入账，available 增加。
- withdraw_freeze: 提现冻结，available 减少，frozen_withdraw 增加。
- withdraw_paid: 提现成功，frozen_withdraw 减少，total_withdrawn 增加。
- withdraw_failed_unfreeze: 提现失败解冻，frozen_withdraw 减少，available 增加。
- risk_freeze: 风控冻结，available 减少，frozen_risk 增加。
- risk_unfreeze: 风控解冻，frozen_risk 减少，available 增加。
- manual_adjust_add: 人工加款，available 增加。
- manual_adjust_sub: 人工扣款，available 减少。
- reversal: 冲正流水，按 ref_ledger_id 反向调整。

## 提现状态机
withdraw_records.status：
- created: 已创建，未冻结。
- frozen: 已冻结。
- reviewing: 人工审核中。
- transfer_processing: 已发起转账，等待结果。
- paid: 已打款成功。
- failed: 转账失败已解冻。
- rejected: 审核拒绝已解冻。
- canceled: 用户取消已解冻。
- abnormal: 金额不一致、回调异常、查单异常。

## 提现流程
1. 用户申请提现。
2. 校验身份、商户状态、余额、门槛、日/月限额、风控状态。
3. 数据库事务内创建提现单 created。
4. 写 withdraw_freeze 流水，钱包冻结，状态 frozen。
5. 如果金额超过人工审核线，状态 reviewing；否则进入 transfer_processing。
6. 调用 TransferProvider。mock 模式返回模拟结果，wechat 模式调用微信商家转账。
7. 回调/查单确认 paid 后写 withdraw_paid。
8. 失败或拒绝写 withdraw_failed_unfreeze 或 rejected 解冻。

## 幂等规则
- withdraw_no 唯一。
- out_bill_no 唯一。
- callback_event_id 唯一。
- 同一提现单只能发起一次真实转账。
- paid 状态不能再次入账。
- failed/rejected/canceled 状态不能再次解冻。
- 金额不一致进入 abnormal，不自动处理。

## 并发锁
申请提现和钱包调整必须：
- SELECT merchant_wallet FOR UPDATE 或使用 version 乐观锁。
- 同一商户同一时间只允许一个提现事务修改钱包。

## 对账任务
每日上午 03:00 执行：
1. 查询 transfer_processing 超过 30 分钟的提现单。
2. 调用 TransferProvider.query。
3. 微信 paid -> 本地 paid。
4. 微信 failed -> 本地 failed 并解冻。
5. 微信不存在/金额不一致 -> abnormal。
6. 写 reconciliation_logs。
