Page({
  data: {
    applicantName: "",
    applicantPhone: "13800000000",
    merchantName: "",
    storeName: "",
    wifiSsid: "",
    agreeMerchantTerms: false,
    phoneTip: "开发阶段可使用 mock/manual 手机号，真实微信手机号授权后置。",
  },
  onSubmitTap() {
    if (!this.data.agreeMerchantTerms) {
      wx.showToast({ title: "请先同意商户协议", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/merchant/application-status" });
  },
  onAgreementTap() {
    wx.navigateTo({ url: "/pages/merchant/agreement" });
  },
  onBackHome() {
    wx.redirectTo({ url: "/pages/wifi/index" });
  },
});
