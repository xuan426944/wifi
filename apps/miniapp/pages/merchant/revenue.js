Page({
  data: {
    state: "empty",
    notice: "预估收益不等于可提现收益",
    filters: {
      dateRange: "今日",
      storeName: "全部门店",
      status: "全部状态",
    },
    list: [],
    loadingText: "正在加载收益明细",
    errorText: "收益明细加载失败",
  },
  onRefreshTap() {
    this.setData({
      state: "ready",
      list: [
        {
          date: "2026-05-23",
          scanCount: 0,
          adCompleteCount: 0,
          effectiveAdCount: 0,
          estimatedCent: 0,
          confirmedCent: 0,
          status: "estimated",
        },
      ],
    });
  },
});
