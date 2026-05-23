Page({
  data: {
    state: "empty",
    applicationNo: "",
    statusText: "暂无申请记录",
    rejectReason: "",
    nextStep: "提交申请后，平台运营会在后台审核并绑定商户老板。",
  },
  onRefreshTap() {
    this.setData({
      state: "ready",
      applicationNo: "MA-MOCK-001",
      statusText: "审核中",
    });
  },
  onCancelTap() {
    this.setData({ state: "ready", statusText: "已取消" });
  },
  onBackHome() {
    wx.redirectTo({ url: "/pages/wifi/index" });
  },
});
