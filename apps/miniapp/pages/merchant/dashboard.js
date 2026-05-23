Page({
  data: {
    state: "ready",
    merchantName: "Mock 商户",
    storeName: "Mock 咖啡店",
    todayEstimatedCent: 0,
    yesterdayConfirmedCent: 0,
    monthRevenueCent: 0,
    totalRevenueCent: 0,
    availableCent: 0,
    withdrawingCent: 0,
    frozenRiskCent: 0,
    todayScanCount: 0,
    todayAdCompleteCount: 0,
    todayConnectSuccessCount: 0,
    currentRank: "暂无排名",
    shareRateText: "50%",
    notice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
  },
  onWithdrawTap() {
    wx.navigateTo({ url: "/pages/merchant/withdraw" });
  },
  onRevenueTap() {
    wx.navigateTo({ url: "/pages/merchant/revenue" });
  },
  onWithdrawRecordsTap() {
    wx.navigateTo({ url: "/pages/merchant/withdraw-records" });
  },
  onRankingTap() {
    wx.navigateTo({ url: "/pages/ranking/index" });
  },
  onQrcodeTap() {
    wx.navigateTo({ url: "/pages/merchant/qrcode" });
  },
});
