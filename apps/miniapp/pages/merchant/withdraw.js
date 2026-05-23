Page({
  data: {
    state: "ready",
    availableCent: 0,
    minWithdrawCent: 1000,
    singleLimitCent: 200000,
    dayRemainCent: 500000,
    amountCent: "",
    protectPeriodText: "新商户保护期内可能限制提现。",
    adCompleteText: "有效广告完成量不足时不可提现。",
    disabledReason: "余额不足、未达提现门槛、风控冻结、提现关闭、保护期内或广告完成量不足时不可提现。",
    loadingText: "正在加载提现规则",
    emptyText: "当前暂无可提现金额",
    errorText: "提现规则加载失败",
  },
  onAllTap() {
    this.setData({ amountCent: String(this.data.availableCent) });
  },
  onSubmitTap() {
    wx.showToast({ title: "Mock 提现申请已提交", icon: "none" });
  },
  onRecordsTap() {
    wx.navigateTo({ url: "/pages/merchant/withdraw-records" });
  },
});
