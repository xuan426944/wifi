import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adminPages, assertAdminPagesAreRunnable, createAdminShell } from "../src";

const phase14Controls = ["search", "reset", "pagination", "loading", "empty", "error", "forbidden"];

describe("Phase 14 admin UI skill acceptance", () => {
  it("keeps every admin table page searchable, resettable, paginated, and state-complete", () => {
    expect(assertAdminPagesAreRunnable()).toBe(true);

    for (const page of adminPages) {
      expect(page.tableControls).toEqual(expect.arrayContaining(phase14Controls));
      expect(page.searchFields.length).toBeGreaterThan(0);
      expect(page.emptyState).toBeTruthy();
      expect(page.loadingText).toBeTruthy();
      expect(page.errorText).toBeTruthy();
      expect(page.forbiddenText).toBeTruthy();
    }
  });

  it("keeps high-risk actions confirmed and sensitive columns masked by default", () => {
    const highRiskActions = adminPages.flatMap((page) => page.actions.filter((action) => action.highRisk));
    expect(highRiskActions.length).toBeGreaterThan(0);
    expect(highRiskActions.every((action) => action.confirmRequired && action.reasonRequired)).toBe(true);

    const sensitiveColumns = adminPages.flatMap((page) => page.tableColumns.filter((column) => column.sensitive));
    expect(sensitiveColumns.map((column) => column.label)).toEqual(
      expect.arrayContaining(["手机号", "密码脱敏", "openid脱敏", "AppSecret", "API v3"]),
    );
  });

  it("hides forbidden actions by RBAC while preserving readable audit states", () => {
    const readonlyReconciliation = createAdminShell("readonly_audit", "/admin/reconciliation");
    expect(readonlyReconciliation.currentPage.visible).toBe(true);
    expect(readonlyReconciliation.currentPage.actions.some((action) => action.key === "run")).toBe(false);
    expect(readonlyReconciliation.currentPage.tableControls).toEqual(expect.arrayContaining(phase14Controls));

    const financeReconciliation = createAdminShell("finance", "/admin/reconciliation");
    expect(financeReconciliation.currentPage.actions.some((action) => action.key === "run")).toBe(true);
  });

  it("ships a static acceptance shell with mock reconciliation, masking, and confirmation copy", () => {
    const html = readFileSync(join(__dirname, "..", "public", "index.html"), "utf8");
    expect(html).toContain('data-ui-acceptance="14"');
    expect(html).toContain("商户申请审核");
    expect(html).toContain("财务对账");
    expect(html).toContain("Mock 模式可展示一致、远端失败、远端成功、本地失败、金额不一致、查单无记录和重复回调差异");
    expect(html).toContain("AppSecret/API v3/支付配置：已脱敏 ********");
    expect(html).toContain("高危操作均需二次确认并填写原因");
    expect(html).not.toMatch(/躺赚|暴利|固定收益|投资回本|拉人返利/);
  });
});
