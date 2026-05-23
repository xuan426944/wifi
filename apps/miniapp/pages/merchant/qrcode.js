Page({
  data: {
    state: "ready",
    storeName: "Mock 咖啡店",
    qrcodeUrl: "/assets/mock-qrcode.png",
    saveTip: "可保存二维码后张贴到门店显眼位置。",
    posterTip: "顾客扫码后进入门店 WiFi、广告观看和一键连接流程。",
  },
  onStoreChange() {
    wx.showToast({ title: "Mock 门店已切换", icon: "none" });
  },
  onSaveTap() {
    wx.showToast({ title: "Mock 二维码已保存", icon: "none" });
  },
});
