Page({
  data: {
    state: "ready",
    applicantName: "",
    applicantPhone: "13800000000",
    merchantName: "",
    storeName: "",
    city: "",
    district: "",
    address: "",
    industry: "",
    wifiSsid: "",
    wifiPassword: "",
    remark: "",
    agreeMerchantTerms: false,
    phoneTip: "开发阶段可使用 mock/manual 手机号，真实微信手机号授权后置。",
    loadingText: "正在提交申请",
    emptyText: "请填写商家申请信息",
    errorText: "申请提交失败，请检查必填项",
    forbiddenText: "当前微信已绑定商户，请进入商家中心",
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
