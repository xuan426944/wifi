import { describe, expect, it } from "vitest";
import { adminPageCatalog, getAdminEmptyState } from "../src";

describe("Phase 01 admin page scaffold", () => {
  it("contains empty states and high-risk controls from the V3.4 specs", () => {
    expect(getAdminEmptyState("/admin/dashboard")).toBe("暂无运营数据");
    expect(adminPageCatalog.some((page) => page.path === "/admin/wifi" && page.emptyState === "未配置")).toBe(true);
    expect(
      adminPageCatalog.some((page) => page.path === "/admin/withdraws" && page.highRiskActions?.includes("审核通过")),
    ).toBe(true);
    expect(adminPageCatalog.some((page) => page.path === "/admin/operation-logs")).toBe(true);
  });
});
