export interface MiniappPageSpec {
  route: string;
  title: string;
  visibleTo: "all" | "merchant_owner_active";
  primaryAction?: string;
  fields: string[];
  emptyState: string;
}

export const miniappPageCatalog: MiniappPageSpec[] = [
  {
    route: "pages/wifi/index",
    title: "WiFi 首页",
    visibleTo: "all",
    primaryAction: "一键连接 WiFi",
    fields: ["门店名称", "WiFi 名称", "广告提示", "连接按钮", "隐私协议入口"],
    emptyState: "正在获取门店信息",
  },
  {
    route: "pages/ad/index",
    title: "广告观看",
    visibleTo: "all",
    fields: ["门店名", "广告加载状态"],
    emptyState: "广告加载中",
  },
  {
    route: "pages/connect-result/index",
    title: "连接结果",
    visibleTo: "all",
    fields: ["连接状态", "失败原因", "复制 WiFi 名称", "复制密码", "手动连接指引"],
    emptyState: "暂无连接结果",
  },
  {
    route: "pages/manual-connect/index",
    title: "手动连接",
    visibleTo: "all",
    fields: ["SSID", "密码复制按钮", "系统设置步骤"],
    emptyState: "请先完成广告授权",
  },
  {
    route: "pages/merchant/dashboard",
    title: "商家看板",
    visibleTo: "merchant_owner_active",
    fields: ["今日预估收益", "昨日确认收益", "本月收益", "可提现金额", "排行榜", "门店二维码"],
    emptyState: "暂无商户数据",
  },
];

export const customerRoutes = miniappPageCatalog
  .filter((page) => page.visibleTo === "all")
  .map((page) => page.route);
