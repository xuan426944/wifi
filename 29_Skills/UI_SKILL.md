# UI_SKILL.md
# 门店扫码 WiFi 广告收益平台 UI 开发 Skill

## 1. Skill 目标

本 Skill 用于指导 AI / Codex / 前端开发者完成本项目所有 UI 页面开发，包括：

- 微信小程序用户端
- 微信小程序商家端
- PC 管理后台
- 低保真原型
- 可运行 HTML 原型
- Vue3 后台页面
- 小程序页面组件

目标：

1. 普通客户连 WiFi 要简单。
2. 商户看收益、提现、排行榜要清楚。
3. 平台后台管理要专业、清晰、可配置。
4. 所有页面必须有空状态、错误状态、加载状态、权限状态。
5. UI 不允许阻塞业务开发。
6. 所有真实配置后置，不影响页面开发。
7. 不允许因为缺少 UI 图而向用户反问。

---

## 2. 使用时机

### 2.1 不建议在 Phase 01 到 Phase 04 强制使用

Phase 01 到 Phase 04 的重点是：

- 项目初始化
- 数据库
- 后端基础
- 登录鉴权
- 商户/门店/WiFi 后端
- 广告观看闭环
- reward_token
- Mock provider

这些阶段不应该被 UI 细节拖慢。

### 2.2 建议从后台和小程序页面开发阶段开始使用

建议在以下阶段启用：

- PC 后台页面开发阶段
- 小程序 WiFi 页面开发阶段
- 小程序商家中心开发阶段
- 商户自助入驻页面开发阶段
- UI 原型生成阶段
- 最终体验优化阶段

### 2.3 最佳使用方式

不要让 Codex 在一开始就“全面美化页面”。

推荐提示词：

```text
本阶段需要开发前端页面。请读取并遵守 29_Skills/UI_SKILL.md。
优先完成功能可用、字段完整、权限正确、状态完整。
视觉效果保持简洁，不做过度美化。
```

---

## 3. 总体 UI 风格

整体风格：

- 简洁
- 干净
- 商业化
- 可信
- 不夸张
- 不做“暴富感”
- 不做资金盘风格
- 不使用夸大收益文案

推荐风格：

- 白色 / 浅灰背景
- 蓝色或绿色作为主色
- 卡片式布局
- 圆角按钮
- 轻量阴影
- 数据重点突出
- 金额展示克制

禁止风格：

- 大面积红色
- “躺赚”
- “日入”
- “暴利”
- “返利”
- “拉人赚钱”
- “固定收益”
- “投资回本”
- 多级佣金视觉暗示

---

## 4. 小程序 UI 总规则

小程序有两类主要访问者：

1. 普通客户
2. 授权商户老板

普通客户默认只能看到 WiFi 连接相关页面。

授权商户老板可以看到商家中心、收益、提现、排行榜、二维码等页面。

双身份用户扫码进入时，默认仍进入 WiFi 首页。  
商家中心入口只作为辅助入口，不影响客户连 WiFi。

---

## 5. 普通客户 WiFi 首页 UI

路径建议：

```text
/pages/wifi/index
```

页面目标：

让客户觉得扫码进来，点一下，看广告，就能连 WiFi。

页面区域：

1. 顶部门店信息
2. WiFi 信息卡片
3. 主操作按钮
4. 广告说明
5. 手动连接入口
6. 隐私协议入口
7. 右下角商家申请入口

字段：

| 字段 | 说明 |
|---|---|
| storeName | 门店名称 |
| storeAddress | 门店地址，可选 |
| wifiSsid | WiFi 名称 |
| wifiStatus | WiFi 配置状态 |
| connectButtonText | 主按钮文案 |
| adRequiredText | 广告说明 |
| manualConnectText | 手动连接入口 |
| privacyText | 隐私政策入口 |
| merchantApplyEntry | 商家申请入口 |

主按钮文案：

- 默认：一键连接 WiFi
- 广告前：观看广告后连接 WiFi
- 广告完成后：正在连接 WiFi...
- WiFi 未配置：门店暂未配置 WiFi
- 连接失败：复制密码手动连接

商家申请入口：

- 文案：商家申请
- 位置：右下角
- 样式：弱化展示，不抢主按钮注意力
- 点击后进入商户申请页

---

## 6. 广告加载页 UI

路径建议：

```text
/pages/wifi/ad
```

页面文案：

广告加载中：

```text
广告加载中，请稍候
```

广告说明：

```text
观看完整广告后，可获取本店 WiFi 连接授权。
```

广告无填充：

```text
当前广告暂时无法加载，请稍后重试或使用手动连接。
```

用户提前关闭广告：

```text
需要完整观看广告后才能自动连接 WiFi。
```

广告完成：

```text
广告已完成，正在为你连接 WiFi。
```

---

## 7. WiFi 连接结果页 UI

路径建议：

```text
/pages/wifi/result
```

成功状态：

- 标题：WiFi 已连接
- 说明：你已成功连接本店 WiFi。
- 按钮：完成

失败状态：

- 标题：自动连接失败
- 说明：可能是系统权限、距离路由器较远或设备限制导致。你可以复制密码手动连接。
- 主按钮：复制 WiFi 密码
- 辅助按钮：查看手动连接步骤

---

## 8. 手动连接页 UI

路径建议：

```text
/pages/wifi/manual
```

页面内容：

1. WiFi 名称
2. 密码复制按钮
3. 手机系统连接步骤
4. 常见问题

密码显示规则：

- 默认不直接明文展示
- 提供“复制密码”按钮
- 后台可配置是否允许显示明文

---

## 9. 商家申请页 UI

路径建议：

```text
/pages/merchant/apply
```

表单字段：

| 字段 | 类型 | 是否必填 | 说明 |
|---|---|---|---|
| merchantName | 输入框 | 是 | 商户名称 |
| ownerName | 输入框 | 是 | 负责人姓名 |
| ownerPhone | 手机号输入 | 是 | 负责人手机号 |
| storeName | 输入框 | 是 | 门店名称 |
| storeCity | 城市选择 | 是 | 门店城市 |
| storeAddress | 输入框 | 是 | 门店地址 |
| industry | 下拉选择 | 是 | 行业 |
| wifiSsid | 输入框 | 否 | WiFi 名称 |
| wifiPassword | 密码框 | 否 | WiFi 密码 |
| businessLicenseImage | 上传 | 否 | 营业执照 |
| remark | 文本域 | 否 | 备注 |
| agreeProtocol | 勾选 | 是 | 同意商户协议 |

提交成功：

- 标题：申请已提交
- 说明：平台将在审核后开通商家中心。审核通过后，你可以查看门店数据、收益和提现。
- 按钮：返回 WiFi 首页

审核中：

- 标题：商家申请审核中
- 说明：你的申请正在审核，请耐心等待。

审核驳回：

- 显示驳回原因
- 显示重新提交按钮

---

## 10. 商家中心 UI

路径建议：

```text
/pages/merchant/dashboard
```

权限：

只有授权商户老板可以访问。  
普通客户访问时返回 WiFi 首页或显示无权限。

页面结构：

1. 顶部商户信息
2. 门店选择器
3. 收益卡片
4. 今日数据卡片
5. 提现入口
6. 排行榜入口
7. 收益明细入口
8. 门店二维码入口

收益卡片字段：

| 字段 | 说明 |
|---|---|
| todayEstimatedIncome | 今日预估收益 |
| yesterdayConfirmedIncome | 昨日确认收益 |
| monthIncome | 本月收益 |
| totalIncome | 累计收益 |
| withdrawableAmount | 可提现金额 |
| frozenAmount | 冻结金额 |
| withdrawingAmount | 提现中金额 |

数据卡片字段：

| 字段 | 说明 |
|---|---|
| todayScanCount | 今日扫码 |
| todayAdFinishCount | 今日广告完成 |
| todayConnectSuccessCount | 今日连接成功 |
| currentRank | 当前排名 |

提示文案：

```text
今日收益为预估金额，最终以平台实际结算和风控审核为准。
```

---

## 11. 商户提现页 UI

路径建议：

```text
/pages/merchant/withdraw
```

页面字段：

| 字段 | 说明 |
|---|---|
| withdrawableAmount | 可提现金额 |
| minWithdrawAmount | 最低提现金额 |
| singleLimit | 单笔上限 |
| dailyRemainLimit | 今日剩余额度 |
| inputAmount | 输入提现金额 |
| withdrawStatusText | 当前提现状态提示 |

禁用原因必须展示具体原因：

- 可提现余额不足
- 未达到最低提现金额
- 新商户保护期内
- 有效广告完成量不足
- 账户风控冻结
- 提现功能暂未开启
- 今日额度已用完

---

## 12. 商户排行榜 UI

路径建议：

```text
/pages/merchant/ranking
```

榜单类型：

- 今日收益榜
- 昨日收益榜
- 本月收益榜
- 累计收益榜
- 扫码人数榜
- 广告完成榜
- 连接成功榜
- 城市收益榜
- 行业收益榜

金额显示方式由后台控制：

- exact：精确金额
- range：区间金额
- heat：热度值
- hidden：隐藏金额

页面必须显示：

- 我的排名
- 榜单更新时间
- 榜单规则说明
- 空状态

---

## 13. PC 后台 UI 总规则

后台技术栈建议：

```text
Vue3 + TypeScript + Element Plus
```

后台页面统一布局：

1. 顶部导航
2. 左侧菜单
3. 主内容区
4. 搜索区域
5. 表格区域
6. 分页
7. 操作弹窗
8. 详情抽屉
9. 操作日志入口

所有列表页必须包含：

- 搜索条件
- 重置按钮
- 查询按钮
- 新增按钮，如有权限
- 表格
- 分页
- 操作列
- 加载状态
- 空状态
- 错误状态

---

## 14. 高危操作 UI 要求

以下操作必须二次确认：

- 修改分成比例
- 修改 WiFi 密码
- 禁用商户
- 禁用门店
- 人工调账
- 冻结钱包
- 解冻钱包
- 审核提现
- 拒绝提现
- 作废收益
- 修改提现规则
- 修改风控规则
- 切换真实支付模式

---

## 15. 后台商户申请审核页

路径建议：

```text
/admin/merchant-applications
```

搜索字段：

| 字段 | 类型 |
|---|---|
| applicationNo | 输入框 |
| merchantName | 输入框 |
| ownerPhone | 输入框 |
| city | 下拉 |
| status | 下拉 |
| createdAtRange | 日期范围 |

列表字段：

| 字段 | 说明 |
|---|---|
| applicationNo | 申请编号 |
| merchantName | 商户名称 |
| storeName | 门店名称 |
| ownerName | 负责人 |
| ownerPhone | 手机号 |
| city | 城市 |
| industry | 行业 |
| status | 状态 |
| createdAt | 提交时间 |

操作：

- 查看详情
- 审核通过
- 驳回
- 标记重复
- 创建商户并绑定老板
- 创建门店
- 配置 WiFi，可选
- 查看日志

审核通过后系统自动：

1. 创建 merchants 记录
2. 创建 stores 记录
3. 创建 merchant_owners 绑定
4. 如果提交了 WiFi，则创建 store_wifi 记录
5. 写 operation_logs
6. 写 merchant_application_logs
7. 通知商户审核通过

---

## 16. 后台 WiFi 管理页

路径建议：

```text
/admin/wifi
```

表单字段：

| 字段 | 类型 | 必填 |
|---|---|---|
| storeId | 门店选择器 | 是 |
| ssid | 输入框 | 是 |
| password | 密码框 | 否 |
| encryptionType | 下拉 | 是 |
| connectMode | 下拉 | 是 |
| isPrimary | 开关 | 是 |
| isEnabled | 开关 | 是 |
| allowCopyPassword | 开关 | 是 |
| showManualGuide | 开关 | 是 |
| passwordDisplayPolicy | 下拉 | 是 |
| remark | 文本域 | 否 |

密码策略：

| 策略 | 说明 |
|---|---|
| never_plain | 永不明文 |
| require_second_confirm | 二次确认后展示 |
| copy_only | 仅允许复制 |
| admin_only | 仅超管可查看 |

操作要求：

- 新增 WiFi
- 编辑 WiFi
- 修改密码
- 启用
- 禁用
- 查看连接失败记录
- 查看操作日志

---

## 17. 后台分成配置 UI

全局分成配置路径：

```text
/admin/system/share-rate
```

字段：

| 字段 | 说明 |
|---|---|
| defaultMerchantShareRateBps | 默认商户分成比例 |
| defaultPlatformShareRateBps | 默认平台分成比例 |
| allowMerchantSpecialRate | 是否允许商户特殊比例 |
| allowStoreSpecialRate | 是否允许门店特殊比例 |
| allowCampaignSpecialRate | 是否允许广告活动特殊比例 |
| effectiveMode | 生效方式 |

商户级分成入口：

```text
/admin/merchants -> 修改分成
```

门店级分成入口：

```text
/admin/stores -> 修改分成
```

---

## 18. 后台财务对账 UI

路径：

```text
/admin/reconciliation
```

页面 Tab：

- 提现对账
- 钱包流水对账
- 收益结算对账
- 差异处理记录

列表字段：

| 字段 | 说明 |
|---|---|
| reconcileNo | 对账编号 |
| type | 对账类型 |
| bizDate | 业务日期 |
| localAmount | 本地金额 |
| remoteAmount | 外部金额 |
| diffAmount | 差异金额 |
| status | 状态 |
| handledBy | 处理人 |
| handledAt | 处理时间 |

操作：

- 发起对账
- 查看详情
- 标记一致
- 标记差异
- 人工处理
- 导出报表

---

## 19. 后台测试与 Mock 工具页

路径：

```text
/admin/dev-tools/mock
```

仅开发/测试环境显示。

功能：

- 模拟广告完成
- 模拟 WiFi 连接成功
- 模拟 WiFi 连接失败
- 模拟提现成功回调
- 模拟提现失败回调
- 模拟重复回调
- 模拟金额不一致
- 触发排行榜刷新
- 触发收益结算
- 触发风控扫描
- 触发对账任务

生产环境必须隐藏。

---

## 20. UI 开发输出要求

Codex 开发 UI 时，每个页面必须输出：

1. 页面组件文件
2. API 调用文件
3. 类型定义文件
4. 表单校验规则
5. 空状态
6. 加载状态
7. 错误状态
8. 权限判断
9. 操作确认弹窗
10. 基础测试

---

## 21. UI 验收标准

普通客户必须通过：

- 扫码进入 WiFi 首页
- 不显示商户数据
- 可以点击一键连接
- 可以观看广告
- 广告完成后连接 WiFi
- 失败后可以手动连接
- WiFi 未配置时有清楚提示
- 商家申请入口不干扰主流程

商户老板必须通过：

- 授权后可以进入商家中心
- 可以查看收益
- 可以查看提现金额
- 可以申请提现
- 可以查看排行榜
- 可以查看二维码
- 没有权限时不能查看其他商户数据

后台管理员必须通过：

- 可以新增商户
- 可以审核商户申请
- 可以新增门店
- 可以配置 WiFi
- 可以修改分成比例
- 可以配置广告
- 可以处理提现
- 可以处理风控
- 可以查看操作日志
- 可以查看对账
- 可以修改系统配置

---

## 22. Codex 执行规则

开发 UI 时必须遵守：

1. 不因为缺少 Figma 反问。
2. 不因为缺少真实配置反问。
3. 优先使用本 Skill 和 V3.4 页面规格。
4. 管理后台默认使用 Vue3 + TypeScript + Element Plus。
5. 小程序默认使用原生小程序或 uni-app，按项目初始化结果执行。
6. 所有页面必须接入 API client。
7. 暂无后端接口时可先接 mock API，但必须保留真实 API 调用层。
8. 所有敏感操作必须二次确认。
9. 所有金额单位内部使用分，前端展示为元。
10. 所有收益文案必须使用“预估收益 / 确认收益 / 可提现金额”，不得写固定收益。
