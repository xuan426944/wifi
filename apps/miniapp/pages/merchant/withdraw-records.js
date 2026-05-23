Page({
  data: {
    state: "empty",
    statuses: ["审核中", "转账中", "已到账", "失败已退回", "审核拒绝", "异常处理中"],
    statusText: "审核中、转账中、已到账、失败已退回、审核拒绝、异常处理中",
    list: [],
  },
  onRefreshTap() {
    this.setData({ state: "ready", list: [{ withdrawNo: "W-MOCK-001", amountCent: 0, status: "审核中" }] });
  },
});
