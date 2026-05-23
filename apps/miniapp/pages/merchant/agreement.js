Page({
  data: {
    state: "ready",
    loadingText: "正在加载商户协议",
    emptyText: "暂无协议内容",
    errorText: "协议加载失败",
    forbiddenText: "请从商家申请流程查看协议",
    clauses: [
      "预估收益不等于可提现收益。",
      "广告必须遵守平台合规要求。",
      "未达提现门槛、异常商户或风控冻结期间不能提现。",
      "真实微信、广告、支付、WiFi 配置均在上线前通过 Adapter 切换。",
    ],
  },
  onBackTap() {
    wx.navigateBack();
  },
});
