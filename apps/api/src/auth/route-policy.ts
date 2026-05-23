import { RoleContext } from "./role-context";

export const CUSTOMER_ALLOWED_ROUTES = [
  "pages/wifi/index",
  "pages/ad/index",
  "pages/connect-result/index",
  "pages/manual-connect/index",
  "pages/agreement/index",
  "pages/error/index",
] as const;

export const MERCHANT_ALLOWED_ROUTES = [
  "pages/merchant/dashboard",
  "pages/merchant/revenue",
  "pages/merchant/withdraw",
  "pages/merchant/withdraws",
  "pages/ranking/index",
  "pages/merchant/qrcode",
  "pages/merchant/settings",
] as const;

export interface RoutePolicy {
  defaultLanding: "wifi" | "merchant_dashboard";
  landingRoute: string;
  merchantEntryVisible: boolean;
  merchantEntryText: "商家申请" | "申请进度" | "商家中心";
  bottomTabs: string[];
  allowedRoutes: string[];
  deniedMerchantRedirect: string;
}

export const buildRoutePolicy = (roleContext: RoleContext): RoutePolicy => {
  const canViewMerchant = roleContext.canViewMerchantPages;
  const merchantEntryText =
    roleContext.merchantStatus === "pending"
      ? "申请进度"
      : canViewMerchant
        ? "商家中心"
        : "商家申请";

  return {
    defaultLanding: roleContext.defaultLanding,
    landingRoute: roleContext.defaultLanding === "merchant_dashboard" ? "pages/merchant/dashboard" : "pages/wifi/index",
    merchantEntryVisible: true,
    merchantEntryText,
    bottomTabs: canViewMerchant ? ["WiFi", "商家", "排行榜", "我的"] : [],
    allowedRoutes: canViewMerchant
      ? [...CUSTOMER_ALLOWED_ROUTES, ...MERCHANT_ALLOWED_ROUTES]
      : [...CUSTOMER_ALLOWED_ROUTES],
    deniedMerchantRedirect: "pages/wifi/index",
  };
};
