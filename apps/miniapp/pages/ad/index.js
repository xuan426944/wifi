Page({
  data: {
    storeName: "Mock 咖啡店",
    state: "ready",
    startText: "观看广告后继续连接",
    loadText: "广告加载中",
    completeText: "广告完成后将继续获取 WiFi 授权",
    manualFallbackText: "广告加载失败时，可按后台规则查看手动连接指引",
    emptyText: "当前暂无可用广告",
    errorText: "当前广告暂不可用，请稍后重试。",
    forbiddenText: "请从 WiFi 首页主动点击后观看广告",
  },
  onStartAdTap() {
    this.setData({ state: "loading" });
    setTimeout(() => {
      this.setData({ state: "ready", loadText: "广告已完成，可继续连接" });
      wx.navigateTo({ url: "/pages/connect-result/index?status=success" });
    }, 300);
  },
  onRetryTap() {
    this.setData({ state: "ready" });
  },
  onManualTap() {
    wx.navigateTo({ url: "/pages/manual-connect/index" });
  },
});
