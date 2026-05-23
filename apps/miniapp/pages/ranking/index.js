Page({
  data: {
    state: "empty",
    rankingType: "今日收益",
    amountDisplayMode: "heat",
    displayModeTip: "排行榜按后台配置展示 exact/range/heat/hidden。",
    riskTip: "异常门店按后台规则隐藏，新店参与规则由后台决定。",
    list: [],
  },
  onRefreshTap() {
    this.setData({
      state: "ready",
      list: [{ rank: 1, storeName: "Mock 咖啡店", valueText: "热度 0" }],
    });
  },
  onBackDashboard() {
    wx.navigateTo({ url: "/pages/merchant/dashboard" });
  },
});
