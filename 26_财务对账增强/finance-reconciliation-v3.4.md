# 财务对账增强 V3.4

## 对账目标
确保本地提现、微信商家转账、钱包流水、收益结算四者一致。

## 对账类型

### 1. 提现对账
数据源：withdraw_records、wallet_ledger、微信转账查单/账单。

对账结果：
- matched：一致。
- local_paid_remote_failed：本地成功，微信失败，必须转异常。
- local_processing_remote_paid：本地处理中，微信已成功，补记 paid。
- local_failed_remote_paid：本地失败，微信成功，高危异常，人工复核。
- amount_mismatch：金额不一致，高危异常。
- missing_remote：微信无记录，人工复核。

### 2. 钱包流水对账
每日重算 merchant_wallets 是否等于 wallet_ledger 累计结果。

异常处理：
- 不允许直接改钱包字段。
- 必须生成 reversal 或 manual_adjust 流水修复。
- 修复必须写 operation_logs。

### 3. 收益结算对账
检查 confirmed/withdrawable 收益是否都有对应 wallet_ledger。

## 后台财务对账页

搜索：对账编号、目标类型、商户、状态、日期。

列表字段：对账编号、类型、本地状态、远端状态、金额、本地金额、远端金额、结果、处理人、创建时间。

操作：查看详情、人工确认、生成冲正、导出、标记异常。

## 定时任务
- 每日 03:00 提现查单对账。
- 每日 03:30 钱包流水重算。
- 每日 04:00 收益入账一致性检查。
- 每小时扫描 processing 超过 2 小时的提现单。

## Mock 模式
开发期必须提供 mock 对账数据：成功、失败、金额不一致、重复回调、查单无记录。
