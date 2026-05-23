# 商户申请状态机 V3.4

状态：

- draft：草稿，用户尚未提交。
- submitted：已提交。
- reviewing：后台审核中。
- approved：审核通过，已创建商户/门店/老板绑定。
- rejected：驳回，可根据 allow_resubmit 决定是否重新提交。
- canceled：用户取消。
- converted：历史兼容状态，表示已转为正式商户。

流转：

```text
draft -> submitted -> reviewing -> approved
submitted -> canceled
reviewing -> rejected
rejected -> submitted
approved -> converted(optional)
```

约束：
- approved 后不得再次编辑申请内容。
- approved 后必须保证 merchant_id、store_id、owner_user_id 至少有 merchant_id 和 store_id。
- 审核通过失败时必须回滚事务，不允许只创建商户未创建门店。
- 写入 WiFi 失败时可不回滚商户创建，但必须记录 application_log 并提示后台补配 WiFi。
