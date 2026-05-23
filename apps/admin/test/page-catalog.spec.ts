import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  adminApiEndpoints,
  adminPageCatalog,
  adminPages,
  assertAdminPagesAreRunnable,
  createAdminShell,
  getAdminEmptyState,
  hasPermission,
} from "../src";

describe("Phase 01 admin page scaffold", () => {
  it("contains empty states and high-risk controls from the V3.4 specs", () => {
    expect(getAdminEmptyState("/admin/dashboard")).toBe("暂无运营数据");
    expect(adminPageCatalog.some((page) => page.path === "/admin/wifi" && page.emptyState === "未配置")).toBe(true);
    expect(adminPageCatalog.some((page) => page.path === "/admin/qrcodes" && page.emptyState === "暂无二维码")).toBe(true);
    expect(
      adminPageCatalog.some((page) => page.path === "/admin/wifi" && page.fields.includes("手动兜底")),
    ).toBe(true);
    expect(
      adminPageCatalog.some((page) => page.path === "/admin/revenue" && page.highRiskActions?.includes("确认结算")),
    ).toBe(true);
    expect(
      adminPageCatalog.some((page) => page.path === "/admin/withdraws" && page.highRiskActions?.includes("审核通过")),
    ).toBe(true);
    expect(adminPageCatalog.some((page) => page.path === "/admin/operation-logs")).toBe(true);
  });
});

describe("Phase 09 PC admin pages", () => {
  it("covers every V3.4 admin module with empty/loading/error/forbidden states", () => {
    expect(assertAdminPagesAreRunnable()).toBe(true);
    expect(adminPageCatalog.map((page) => page.path)).toEqual(
      expect.arrayContaining([
        "/admin/dashboard",
        "/admin/merchant-applications",
        "/admin/merchants",
        "/admin/stores",
        "/admin/wifi",
        "/admin/qrcodes",
        "/admin/ads",
        "/admin/campaigns",
        "/admin/revenue",
        "/admin/wallets",
        "/admin/withdraws",
        "/admin/reconciliation",
        "/admin/ranking",
        "/admin/risk-events",
        "/admin/system-config",
        "/admin/integrations",
        "/admin/permissions",
        "/admin/operation-logs",
      ]),
    );
    for (const page of adminPages) {
      expect(page.searchFields.length + page.formFields.length).toBeGreaterThan(0);
      expect(page.tableColumns.length).toBeGreaterThan(0);
      expect(page.emptyState).not.toBe("");
      expect(page.loadingText).not.toBe("");
      expect(page.errorText).not.toBe("");
      expect(page.forbiddenText).not.toBe("");
    }
  });

  it("hides forbidden actions by RBAC and requires confirmation for high-risk controls", () => {
    const readonlyShell = createAdminShell("readonly_audit", "/admin/ranking");
    expect(readonlyShell.currentPage.visible).toBe(true);
    expect(readonlyShell.currentPage.actions.some((action) => action.key === "save")).toBe(false);

    const financeShell = createAdminShell("finance", "/admin/reconciliation");
    expect(financeShell.currentPage.visible).toBe(true);
    expect(financeShell.currentPage.actions.some((action) => action.key === "run")).toBe(true);

    const customerServiceWallet = createAdminShell("customer_service", "/admin/wallets");
    expect(customerServiceWallet.currentPage.state).toBe("forbidden");

    const unsafe = adminPages
      .flatMap((page) => page.actions)
      .filter((action) => action.highRisk && (!action.confirmRequired || !action.reasonRequired));
    expect(unsafe).toEqual([]);
    expect(hasPermission("readonly_audit", "system_config.write")).toBe(false);
  });

  it("binds page APIs to mock-safe endpoints and keeps sensitive third-party values masked", () => {
    for (const endpoint of adminApiEndpoints) {
      expect(endpoint.path.startsWith("/api/admin/")).toBe(true);
      expect(endpoint.mockSafe).toBe(true);
    }
    const integrationPage = adminPages.find((page) => page.path === "/admin/integrations");
    expect(integrationPage?.tableColumns.filter((column) => column.sensitive).map((column) => column.label)).toEqual(
      expect.arrayContaining(["微信 AppID", "AppSecret", "广告位", "支付商户号", "API v3"]),
    );
  });

  it("ships a static admin shell that opens with Phase 09 empty states", () => {
    const html = readFileSync(join(__dirname, "..", "public", "index.html"), "utf8");
    expect(html).toContain('data-phase="09"');
    expect(html).toContain("暂无商户");
    expect(html).toContain("未配置");
    expect(html).toContain("暂无收益记录");
    expect(html).toContain("开发阶段全部 Mock/Adapter");
    expect(html).not.toMatch(/躺赚|暴利|固定收益|投资回本/);
  });
});
