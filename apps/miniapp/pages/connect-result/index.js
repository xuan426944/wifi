Page({
  data: {
    state: "ready",
    status: "success",
    failReason: "",
    ssid: "MOCK-WIFI",
    password: "mock-password",
    successText: "已连接 WiFi",
    failedText: "连接失败，请复制密码后手动连接",
    loadingText: "正在确认连接结果",
    emptyText: "暂无连接结果",
    errorText: "连接结果获取失败",
    forbiddenText: "请先完成 WiFi 授权",
  },
  onLoad(query) {
    this.setData({
      status: query?.status || "success",
      failReason: query?.failReason || "系统连接失败",
    });
  },
  onCopySsid() {
    wx.setClipboardData({ data: this.data.ssid });
  },
  onCopyPassword() {
    wx.setClipboardData({ data: this.data.password });
  },
  onManualTap() {
    wx.navigateTo({ url: "/pages/manual-connect/index" });
  },
  onRetryTap() {
    wx.navigateBack();
  },
  onBackTap() {
    wx.navigateBack();
  },
});
