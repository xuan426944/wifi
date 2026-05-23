export type MiniappRoleGate =
  | "public_wifi_flow"
  | "merchant_application_public"
  | "active_merchant_owner_only";

export type MiniappPageState =
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "forbidden"
  | "wifi_missing"
  | "ad_required"
  | "manual_fallback"
  | "risk_frozen";

export interface MiniappApiBinding {
  key: string;
  method: "GET" | "POST";
  path: string;
  mockSafe: true;
  requiresRealConfig: false;
}

export interface MiniappPageSpec {
  route: string;
  title: string;
  roleGate: MiniappRoleGate;
  primaryAction?: string;
  weakEntry?: {
    textByMerchantStatus: Record<"none" | "pending" | "active", "商家申请" | "申请进度" | "商家中心">;
    placement: "bottom_right";
  };
  fields: string[];
  actions: string[];
  states: MiniappPageState[];
  emptyState: string;
  forbiddenRedirect?: "pages/wifi/index";
  apiBindings: MiniappApiBinding[];
  complianceCopy: string[];
}

const endpoint = (binding: Omit<MiniappApiBinding, "mockSafe" | "requiresRealConfig">): MiniappApiBinding => ({
  ...binding,
  mockSafe: true,
  requiresRealConfig: false,
});

export const miniappApiBindings = {
  authLogin: endpoint({ key: "auth.wxLogin", method: "POST", path: "/api/auth/wx-login" }),
  storeLanding: endpoint({ key: "store.landing", method: "GET", path: "/api/store/landing" }),
  scanReport: endpoint({ key: "scan.report", method: "POST", path: "/api/scan/report" }),
  adStart: endpoint({ key: "ad.view.start", method: "POST", path: "/api/ad/view/start" }),
  adFinish: endpoint({ key: "ad.view.finish", method: "POST", path: "/api/ad/view/finish" }),
  wifiRewardToken: endpoint({ key: "wifi.rewardToken", method: "POST", path: "/api/wifi/reward-token" }),
  wifiConnectInfo: endpoint({ key: "wifi.connectInfo", method: "POST", path: "/api/wifi/connect-info" }),
  wifiConnectResult: endpoint({ key: "wifi.connectResult", method: "POST", path: "/api/wifi/connect-result" }),
  merchantApplicationSubmit: endpoint({ key: "merchantApplication.submit", method: "POST", path: "/api/merchant/applications" }),
  merchantApplicationLatest: endpoint({
    key: "merchantApplication.latest",
    method: "GET",
    path: "/api/merchant/applications/my/latest",
  }),
  merchantApplicationCancel: endpoint({
    key: "merchantApplication.cancel",
    method: "POST",
    path: "/api/merchant/applications/:applicationNo/cancel",
  }),
  merchantDashboard: endpoint({ key: "merchant.dashboard", method: "GET", path: "/api/merchant/dashboard" }),
  merchantRevenue: endpoint({ key: "merchant.revenue", method: "GET", path: "/api/merchant/revenue" }),
  merchantWithdrawApply: endpoint({ key: "merchant.withdraw.apply", method: "POST", path: "/api/merchant/withdraw/apply" }),
  merchantWithdraws: endpoint({ key: "merchant.withdraws", method: "GET", path: "/api/merchant/withdraws" }),
  rankingStore: endpoint({ key: "ranking.store", method: "GET", path: "/api/ranking/store" }),
} satisfies Record<string, MiniappApiBinding>;

export const miniappPageCatalog: MiniappPageSpec[] = [
  {
    route: "pages/wifi/index",
    title: "门店 WiFi",
    roleGate: "public_wifi_flow",
    primaryAction: "一键连接 WiFi",
    weakEntry: {
      textByMerchantStatus: {
        none: "商家申请",
        pending: "申请进度",
        active: "商家中心",
      },
      placement: "bottom_right",
    },
    fields: ["门店名称", "WiFi 名称", "广告提示", "隐私协议入口", "商家申请/商家中心入口"],
    actions: ["一键连接 WiFi", "查看手动连接", "商家申请", "申请进度", "商家中心"],
    states: ["loading", "ready", "wifi_missing", "ad_required", "error"],
    emptyState: "正在获取门店信息",
    apiBindings: [miniappApiBindings.authLogin, miniappApiBindings.storeLanding, miniappApiBindings.scanReport],
    complianceCopy: ["连接前需按门店规则观看广告", "普通客户默认停留在 WiFi 页面"],
  },
  {
    route: "pages/ad/index",
    title: "广告观看",
    roleGate: "public_wifi_flow",
    primaryAction: "观看广告后继续连接",
    fields: ["门店名称", "广告加载状态", "倒计时", "广告完成状态"],
    actions: ["用户点击后拉起广告", "重试", "返回 WiFi 首页"],
    states: ["loading", "ready", "error", "manual_fallback"],
    emptyState: "广告加载中",
    apiBindings: [miniappApiBindings.adStart, miniappApiBindings.adFinish, miniappApiBindings.wifiRewardToken],
    complianceCopy: ["必须用户点击触发广告，不能自动弹出", "广告完成以后才继续获取 WiFi 授权"],
  },
  {
    route: "pages/connect-result/index",
    title: "连接结果",
    roleGate: "public_wifi_flow",
    fields: ["连接状态", "失败原因", "复制 WiFi 名称", "复制密码", "手动连接指引"],
    actions: ["重试连接", "复制 WiFi 名称", "复制密码", "打开系统设置", "返回首页"],
    states: ["ready", "empty", "error", "manual_fallback"],
    emptyState: "暂无连接结果",
    apiBindings: [miniappApiBindings.wifiConnectResult],
    complianceCopy: ["连接失败后必须提供复制密码和手动连接指引"],
  },
  {
    route: "pages/manual-connect/index",
    title: "手动连接",
    roleGate: "public_wifi_flow",
    fields: ["SSID", "密码", "复制按钮", "系统设置步骤", "reward_token 状态"],
    actions: ["复制 WiFi 名称", "复制密码", "打开系统设置", "返回 WiFi 首页"],
    states: ["ready", "empty", "forbidden", "manual_fallback"],
    emptyState: "请先完成广告授权",
    apiBindings: [miniappApiBindings.wifiConnectInfo],
    complianceCopy: ["没有有效 reward_token 时只展示后台允许的失败兜底"],
  },
  {
    route: "pages/merchant/apply",
    title: "商家申请",
    roleGate: "merchant_application_public",
    primaryAction: "提交申请",
    fields: ["商户名称", "联系人", "手机号", "门店名称", "可选 WiFi 信息", "商户协议勾选"],
    actions: ["提交申请", "查看商户协议", "返回 WiFi 首页"],
    states: ["ready", "loading", "error"],
    emptyState: "请填写商家申请信息",
    apiBindings: [miniappApiBindings.merchantApplicationSubmit],
    complianceCopy: ["开发阶段可使用 mock/manual 手机号", "真实微信手机号授权后置"],
  },
  {
    route: "pages/merchant/application-status",
    title: "申请进度",
    roleGate: "merchant_application_public",
    fields: ["申请单号", "审核状态", "驳回原因", "下一步指引"],
    actions: ["刷新进度", "取消申请", "返回 WiFi 首页"],
    states: ["loading", "ready", "empty", "error"],
    emptyState: "暂无申请记录",
    apiBindings: [miniappApiBindings.merchantApplicationLatest, miniappApiBindings.merchantApplicationCancel],
    complianceCopy: ["未授权商户不能进入商家收益页面"],
  },
  {
    route: "pages/merchant/agreement",
    title: "商户协议",
    roleGate: "merchant_application_public",
    fields: ["收益预估说明", "广告合规提示", "提现门槛提示", "风控规则提示"],
    actions: ["同意并返回", "返回"],
    states: ["ready"],
    emptyState: "暂无协议内容",
    apiBindings: [],
    complianceCopy: ["预估收益不等于可提现收益", "异常商户不能提现"],
  },
  {
    route: "pages/merchant/dashboard",
    title: "商家中心",
    roleGate: "active_merchant_owner_only",
    fields: [
      "今日预估收益",
      "昨日确认收益",
      "本月收益",
      "累计收益",
      "可提现金额",
      "提现中金额",
      "风控冻结金额",
      "今日扫码",
      "今日广告完成",
      "今日连接成功",
      "当前排名",
      "分成比例",
      "门店选择器",
    ],
    actions: ["提现", "收益明细", "提现记录", "排行榜", "门店二维码", "切换门店"],
    states: ["loading", "ready", "empty", "forbidden", "risk_frozen"],
    emptyState: "暂无商户数据",
    forbiddenRedirect: "pages/wifi/index",
    apiBindings: [miniappApiBindings.merchantDashboard],
    complianceCopy: ["预估收益不等于可提现收益，以结算确认和风控审核后金额为准"],
  },
  {
    route: "pages/merchant/revenue",
    title: "收益明细",
    roleGate: "active_merchant_owner_only",
    fields: ["日期", "门店", "状态", "扫码数", "广告完成", "有效广告", "预估收益", "确认收益"],
    actions: ["筛选日期", "切换门店", "刷新明细"],
    states: ["loading", "ready", "empty", "forbidden", "error"],
    emptyState: "暂无收益明细",
    forbiddenRedirect: "pages/wifi/index",
    apiBindings: [miniappApiBindings.merchantRevenue],
    complianceCopy: ["预估收益不等于可提现收益"],
  },
  {
    route: "pages/merchant/withdraw",
    title: "提现",
    roleGate: "active_merchant_owner_only",
    fields: ["可提现金额", "最低提现金额", "单笔上限", "日剩余额度", "保护期提示", "有效广告完成量提示", "提现金额输入"],
    actions: ["全部提现", "提交提现", "查看提现记录"],
    states: ["loading", "ready", "empty", "forbidden", "risk_frozen", "error"],
    emptyState: "当前暂无可提现金额",
    forbiddenRedirect: "pages/wifi/index",
    apiBindings: [miniappApiBindings.merchantDashboard, miniappApiBindings.merchantWithdrawApply],
    complianceCopy: ["未达提现门槛、风控冻结、保护期内或广告完成量不足时不可提现"],
  },
  {
    route: "pages/merchant/withdraw-records",
    title: "提现记录",
    roleGate: "active_merchant_owner_only",
    fields: ["提现单号", "金额", "状态", "申请时间", "到账时间", "失败原因"],
    actions: ["刷新记录", "查看详情"],
    states: ["loading", "ready", "empty", "forbidden", "error"],
    emptyState: "暂无提现记录",
    forbiddenRedirect: "pages/wifi/index",
    apiBindings: [miniappApiBindings.merchantWithdraws],
    complianceCopy: ["没有微信最终确认不能标记已到账"],
  },
  {
    route: "pages/merchant/qrcode",
    title: "门店二维码",
    roleGate: "active_merchant_owner_only",
    fields: ["门店选择", "二维码图片", "下载保存提示", "张贴说明"],
    actions: ["切换门店", "保存二维码", "复制张贴说明"],
    states: ["loading", "ready", "empty", "forbidden", "error"],
    emptyState: "暂无二维码",
    forbiddenRedirect: "pages/wifi/index",
    apiBindings: [miniappApiBindings.merchantDashboard],
    complianceCopy: ["二维码仅用于门店扫码 WiFi 入口"],
  },
  {
    route: "pages/ranking/index",
    title: "商家排行榜",
    roleGate: "active_merchant_owner_only",
    fields: ["榜单类型", "展示模式", "名次", "门店名称", "收益/热度", "新店与风控隐藏提示"],
    actions: ["切换榜单", "刷新榜单", "返回商家中心"],
    states: ["loading", "ready", "empty", "forbidden", "error"],
    emptyState: "暂无排行榜数据",
    forbiddenRedirect: "pages/wifi/index",
    apiBindings: [miniappApiBindings.rankingStore],
    complianceCopy: ["排行榜按后台配置展示 exact/range/heat/hidden", "异常门店按后台规则隐藏"],
  },
];

export const customerRoutes = miniappPageCatalog
  .filter((page) => page.roleGate !== "active_merchant_owner_only")
  .map((page) => page.route);

export const merchantProtectedRoutes = miniappPageCatalog
  .filter((page) => page.roleGate === "active_merchant_owner_only")
  .map((page) => page.route);

export interface MiniappRouteContext {
  canViewMerchantPages: boolean;
  merchantStatus: "none" | "pending" | "active" | "disabled" | "risk_frozen";
}

export const createMiniappRouteDecision = (route: string, context: MiniappRouteContext) => {
  const page = miniappPageCatalog.find((item) => item.route === route);
  if (!page) {
    return { route: "pages/wifi/index", state: "error" as const, reason: "页面不存在" };
  }
  if (page.roleGate === "active_merchant_owner_only" && !context.canViewMerchantPages) {
    return {
      route: page.forbiddenRedirect ?? "pages/wifi/index",
      state: "forbidden" as const,
      reason: "无权访问商家页面，已返回 WiFi 首页",
    };
  }
  return { route, state: "ready" as const, reason: "允许访问" };
};

export const assertMiniappPagesAreRunnable = () =>
  miniappPageCatalog.every(
    (page) =>
      page.route &&
      page.title &&
      page.fields.length > 0 &&
      page.actions.length > 0 &&
      page.states.includes("ready") &&
      page.emptyState &&
      page.apiBindings.every((binding) => binding.mockSafe && binding.requiresRealConfig === false),
  );
