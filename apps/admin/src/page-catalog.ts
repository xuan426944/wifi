export interface AdminPageSpec {
  path: string;
  title: string;
  permission: string;
  fields: string[];
  actions: string[];
  emptyState: string;
  highRiskActions?: string[];
}

export const adminPageCatalog: AdminPageSpec[] = [
  {
    path: "/admin/dashboard",
    title: "数据总览",
    permission: "admin.dashboard.read",
    fields: ["今日扫码人数", "今日广告完成", "今日连接成功", "今日预估总收益"],
    actions: ["刷新", "导出日报"],
    emptyState: "暂无运营数据",
  },
  {
    path: "/admin/merchants",
    title: "商户管理",
    permission: "merchant.create",
    fields: ["商户编号", "商户名称", "老板姓名", "手机号", "分成比例", "状态", "风控状态"],
    actions: ["新增", "编辑", "审核通过", "禁用", "绑定老板", "修改分成比例"],
    highRiskActions: ["禁用", "修改分成比例"],
    emptyState: "暂无商户",
  },
  {
    path: "/admin/stores",
    title: "门店管理",
    permission: "store.create",
    fields: ["门店编号", "门店名称", "所属商户", "城市", "地址", "门店分成比例", "WiFi 状态", "二维码状态", "状态"],
    actions: ["新增", "编辑", "禁用", "启用", "配置 WiFi", "生成二维码", "下载二维码", "修改分成比例"],
    highRiskActions: ["禁用", "修改分成比例"],
    emptyState: "暂无门店",
  },
  {
    path: "/admin/wifi",
    title: "WiFi 管理",
    permission: "wifi.write",
    fields: ["门店", "商户", "SSID", "密码脱敏", "加密类型", "连接模式", "允许复制", "手动兜底", "启用状态", "更新时间"],
    actions: ["新增", "编辑", "禁用", "启用", "重置密码", "复制密码", "查看连接失败"],
    highRiskActions: ["禁用", "启用", "重置密码", "复制密码"],
    emptyState: "未配置",
  },
  {
    path: "/admin/qrcodes",
    title: "二维码管理",
    permission: "store.create",
    fields: ["门店", "商户", "scene", "二维码预览", "状态", "创建时间"],
    actions: ["生成", "下载", "禁用", "重新生成"],
    highRiskActions: ["禁用", "重新生成"],
    emptyState: "暂无二维码",
  },
  {
    path: "/admin/wallets",
    title: "钱包管理",
    permission: "wallet.read",
    fields: ["商户", "累计确认", "可提现", "提现冻结", "风控冻结", "累计提现"],
    actions: ["查看流水", "人工调账", "风控冻结", "风控解冻"],
    highRiskActions: ["人工调账", "风控冻结", "风控解冻"],
    emptyState: "暂无钱包数据",
  },
  {
    path: "/admin/withdraws",
    title: "提现管理",
    permission: "withdraw.review",
    fields: ["提现单号", "商户", "openid脱敏", "金额", "状态", "失败原因"],
    actions: ["查看", "审核通过", "审核拒绝", "查单", "标记异常"],
    highRiskActions: ["审核通过", "审核拒绝", "标记异常"],
    emptyState: "暂无提现记录",
  },
  {
    path: "/admin/operation-logs",
    title: "操作日志",
    permission: "operation_log.read",
    fields: ["操作者", "动作", "目标类型", "目标 ID", "IP", "时间"],
    actions: ["查看详情", "导出"],
    emptyState: "暂无操作日志",
  },
];

export const getAdminEmptyState = (path: string) =>
  adminPageCatalog.find((page) => page.path === path)?.emptyState ?? "暂无数据";
