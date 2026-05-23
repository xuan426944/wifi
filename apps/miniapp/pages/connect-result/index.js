Page({
  data: {
    status: "success",
    failReason: "",
    ssid: "MOCK-WIFI",
    password: "mock-password",
    successText: "已连接 WiFi",
    failedText: "连接失败，请复制密码后手动连接",
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
