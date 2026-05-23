Page({
  data: {
    storeName: "Mock 咖啡店",
    state: "ready",
    startText: "观看广告后继续连接",
    loadText: "广告加载中",
    completeText: "广告完成后将继续获取 WiFi 授权",
    manualFallbackText: "广告加载失败时，可按后台规则查看手动连接指引",
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
