Page({
  data: {
    state: "empty",
    applicationNo: "",
    statusText: "暂无申请记录",
    rejectReason: "",
    nextStep: "提交申请后，平台运营会在后台审核并绑定商户老板。",
    loadingText: "正在查询申请进度",
    errorText: "申请进度加载失败",
    forbiddenText: "当前微信已绑定商户，请进入商家中心",
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
  onDashboardTap() {
    wx.navigateTo({ url: "/pages/merchant/dashboard" });
  },
});
