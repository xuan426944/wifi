import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertMiniappPagesAreRunnable,
  createMiniappRouteDecision,
  customerRoutes,
  merchantProtectedRoutes,
  miniappApiBindings,
  miniappPageCatalog,
} from "../src";

const readMiniappFile = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

describe("Phase 10 miniapp pages", () => {
  it("keeps the ordinary customer WiFi path minimal and hides merchant-sensitive pages", () => {
    const wifiHome = miniappPageCatalog.find((page) => page.route === "pages/wifi/index");

    expect(wifiHome?.primaryAction).toBe("一键连接 WiFi");
    expect(wifiHome?.weakEntry?.placement).toBe("bottom_right");
    expect(wifiHome?.weakEntry?.textByMerchantStatus).toMatchObject({
      none: "商家申请",
      pending: "申请进度",
      active: "商家中心",
    });
    expect(customerRoutes).toEqual(expect.arrayContaining(["pages/wifi/index", "pages/ad/index", "pages/manual-connect/index"]));
    expect(customerRoutes).not.toEqual(expect.arrayContaining(["pages/merchant/dashboard", "pages/merchant/withdraw"]));
    expect(customerRoutes.some((route) => route.includes("revenue") || route.includes("qrcode"))).toBe(false);
  });

  it("covers merchant center, revenue, withdraw, ranking, and qrcode pages for active owners only", () => {
    expect(merchantProtectedRoutes).toEqual(
      expect.arrayContaining([
        "pages/merchant/dashboard",
        "pages/merchant/revenue",
        "pages/merchant/withdraw",
        "pages/merchant/withdraw-records",
        "pages/merchant/qrcode",
        "pages/ranking/index",
      ]),
    );

    for (const route of merchantProtectedRoutes) {
      const page = miniappPageCatalog.find((item) => item.route === route);
      expect(page?.roleGate).toBe("active_merchant_owner_only");
      expect(page?.states).toContain("forbidden");
      expect(page?.forbiddenRedirect).toBe("pages/wifi/index");
    }

    expect(createMiniappRouteDecision("pages/merchant/dashboard", { canViewMerchantPages: false, merchantStatus: "none" })).toMatchObject({
      route: "pages/wifi/index",
      state: "forbidden",
    });
    expect(createMiniappRouteDecision("pages/merchant/dashboard", { canViewMerchantPages: true, merchantStatus: "active" })).toMatchObject({
      route: "pages/merchant/dashboard",
      state: "ready",
    });
  });

  it("binds all page APIs through mock-safe adapters without real configuration", () => {
    expect(assertMiniappPagesAreRunnable()).toBe(true);

    for (const binding of Object.values(miniappApiBindings)) {
      expect(binding.path.startsWith("/api/")).toBe(true);
      expect(binding.mockSafe).toBe(true);
      expect(binding.requiresRealConfig).toBe(false);
    }
  });

  it("registers all Phase 10 pages in app.json and ships compliance copy in WXML", () => {
    const appJson = JSON.parse(readMiniappFile("app.json")) as { pages: string[] };
    for (const page of miniappPageCatalog) {
      expect(appJson.pages).toContain(page.route);
    }

    const wifiWxml = readMiniappFile("pages/wifi/index.wxml");
    expect(wifiWxml).toContain("一键连接 WiFi");
    expect(wifiWxml).toContain("merchant-entry");
    expect(wifiWxml).not.toMatch(/可提现金额|排行榜管理|收益明细/);

    const dashboardWxml = readMiniappFile("pages/merchant/dashboard.wxml");
    expect(dashboardWxml).toContain("预估收益不等于可提现收益");
    expect(dashboardWxml).toContain("门店二维码");

    const withdrawWxml = readMiniappFile("pages/merchant/withdraw.wxml");
    expect(withdrawWxml).toContain("最低提现金额");
    expect(withdrawWxml).toContain("风控冻结");

    const rankingWxml = readMiniappFile("pages/ranking/index.wxml");
    expect(rankingWxml).toContain("exact/range/heat/hidden");
    expect(rankingWxml).toContain("异常门店");
  });
});
