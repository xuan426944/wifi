Page({
  data: {
    state: "manual_fallback",
    ssid: "MOCK-WIFI",
    password: "mock-password",
    steps: ["复制 WiFi 名称", "复制 WiFi 密码", "打开系统设置并手动连接", "返回小程序查看连接结果"],
    forbiddenText: "请先完成广告授权",
  },
  onCopySsid() {
    wx.setClipboardData({ data: this.data.ssid });
  },
  onCopyPassword() {
    wx.setClipboardData({ data: this.data.password });
  },
  onBackHome() {
    wx.redirectTo({ url: "/pages/wifi/index" });
  },
});
