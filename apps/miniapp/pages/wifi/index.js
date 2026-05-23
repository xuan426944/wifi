Page({
  data: {
    state: "loading",
    storeName: "Mock 咖啡店",
    wifiName: "MOCK-WIFI",
    primaryAction: "一键连接 WiFi",
    adNotice: "观看广告后可获得本次 WiFi 连接授权。如广告暂不可用，可稍后重试或联系店员。",
    missingWifiText: "门店 WiFi 暂未配置，请联系店员",
    merchantEntryText: "商家申请",
    merchantEntryTarget: "/pages/merchant/apply",
    canViewMerchantPages: false,
    privacyText: "隐私协议",
    emptyText: "请扫码进入门店 WiFi",
    forbiddenText: "当前微信未绑定商户，请先使用 WiFi 主流程。",
  },
  onLoad(query) {
    const merchantStatus = query?.merchantStatus || "none";
    const canViewMerchantPages = merchantStatus === "active";
    this.setData({
      state: "ready",
      canViewMerchantPages,
      merchantEntryText: merchantStatus === "pending" ? "申请进度" : canViewMerchantPages ? "商家中心" : "商家申请",
      merchantEntryTarget: merchantStatus === "pending"
        ? "/pages/merchant/application-status"
        : canViewMerchantPages
          ? "/pages/merchant/dashboard"
          : "/pages/merchant/apply",
    });
  },
  onPrimaryTap() {
    wx.navigateTo({ url: "/pages/ad/index" });
  },
  onManualTap() {
    wx.navigateTo({ url: "/pages/manual-connect/index" });
  },
  onMerchantEntryTap() {
    wx.navigateTo({ url: this.data.merchantEntryTarget });
  },
});
