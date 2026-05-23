# WiFi 配置规则 V3.4

## 基本原则
WiFi 信息允许源码开发完成、部署之后再由后台手动配置。开发阶段使用 Mock WiFi，不阻塞开发。

## 门店 WiFi 模型
默认一个门店一个主 WiFi。V3.4 预留多 WiFi 扩展字段 wifi_priority，但 schema 默认以 store_id + is_primary 唯一控制主 WiFi。

## 后台 WiFi 配置页面字段
页面：PC 后台 -> WiFi 管理 -> 新增/编辑 WiFi

字段：
- store_id: 门店，必填，下拉选择。
- ssid: WiFi 名称，必填，1-64 字符。
- password: WiFi 密码，新增必填，编辑可留空表示不修改。
- security_type: none|WEP|WPA|WPA2|WPA3，默认 WPA2。
- connect_mode: mock|wechat|manual，默认 mock。
- is_primary: 是否主 WiFi，默认 true。
- is_enabled: 是否启用，默认 true。
- allow_copy_password: 是否允许复制密码，默认 true。
- show_manual_fallback: 连接失败是否显示手动连接，默认 true。
- password_view_policy: never_plain|copy_only|second_confirm_plain，默认 never_plain。
- remark: 内部备注。

## 密码安全
1. 密码必须服务端加密存储。
2. 日志不得打印明文密码。
3. 列表页只显示 password_masked，例如 ********。
4. 复制密码接口必须鉴权并记录日志。
5. 商户老板默认只能复制自己门店密码，是否允许由配置 merchant_can_copy_wifi_password 控制。
6. 运营可编辑但不能查看明文。
7. 超管二次验证后可重置密码，不建议显示明文。

## 用户端未配置处理
如果门店未配置 WiFi：
- 小程序展示门店名称。
- 一键连接按钮置灰。
- 提示“门店 WiFi 暂未配置，请联系店员”。
- 不强制观看广告。
- 上报 wifi_missing 事件。

## Mock WiFi
开发阶段默认返回：
- ssid: Mock-WiFi
- password: 12345678
- security_type: WPA2
- connect_mode: mock
Mock 模式必须允许完成广告、reward_token、连接结果上报、收益记录的完整流程。

## 连接失败兜底
任何 connectWifi 失败都必须展示：
1. 复制 WiFi 名称
2. 复制 WiFi 密码
3. 打开系统设置指引
4. 返回首页

## 后台操作日志
新增、修改、禁用、启用、重置 WiFi 密码、复制密码都必须写 operation_logs。
