import { describe, expect, it } from "vitest";
import { customerRoutes, miniappPageCatalog } from "../src";

describe("Phase 01 miniapp scaffold", () => {
  it("keeps ordinary customers on the minimal WiFi path", () => {
    expect(customerRoutes).toContain("pages/wifi/index");
    expect(customerRoutes).toContain("pages/ad/index");
    expect(customerRoutes).not.toContain("pages/merchant/dashboard");

    const wifiHome = miniappPageCatalog.find((page) => page.route === "pages/wifi/index");
    expect(wifiHome?.primaryAction).toBe("一键连接 WiFi");
    expect(wifiHome?.visibleTo).toBe("all");
  });

  it("keeps merchant dashboard reserved for active merchant owners", () => {
    const dashboard = miniappPageCatalog.find((page) => page.route === "pages/merchant/dashboard");
    expect(dashboard?.visibleTo).toBe("merchant_owner_active");
    expect(dashboard?.fields).toContain("可提现金额");
    expect(dashboard?.fields).toContain("门店二维码");
  });
});
