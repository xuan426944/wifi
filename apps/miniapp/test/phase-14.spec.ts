import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertMiniappUiAcceptance,
  createMiniappRouteDecision,
  merchantProtectedRoutes,
  miniappPageCatalog,
} from "../src";

const readMiniappFile = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

const collectFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const absolute = join(dir, entry);
    return statSync(absolute).isDirectory() ? collectFiles(absolute) : [absolute];
  });

describe("Phase 14 miniapp UI skill acceptance", () => {
  it("keeps the customer WiFi path obvious and the merchant entry weak", () => {
    expect(assertMiniappUiAcceptance()).toBe(true);

    const wifiPage = miniappPageCatalog.find((page) => page.route === "pages/wifi/index");
    expect(wifiPage?.primaryAction).toBe("一键连接 WiFi");
    expect(wifiPage?.weakEntry?.placement).toBe("bottom_right");

    const wifiWxml = readMiniappFile("pages/wifi/index.wxml");
    const wifiWxss = readMiniappFile("pages/wifi/index.wxss");
    expect(wifiWxml).toContain("一键连接 WiFi");
    expect(wifiWxml).toContain("merchant-entry");
    expect(wifiWxml).toContain("disabled=\"{{state === 'wifi_missing' || state === 'loading'}}\"");
    expect(wifiWxss).toContain("position: fixed");
    expect(wifiWxss).toContain("right: 36rpx");
    expect(wifiWxml).not.toMatch(/可提现金额|收益明细|排行榜管理|门店二维码/);
  });

  it("keeps protected merchant pages forbidden for ordinary customers", () => {
    for (const route of merchantProtectedRoutes) {
      expect(createMiniappRouteDecision(route, { canViewMerchantPages: false, merchantStatus: "none" })).toMatchObject({
        route: "pages/wifi/index",
        state: "forbidden",
      });
    }

    const dashboardWxml = readMiniappFile("pages/merchant/dashboard.wxml");
    expect(dashboardWxml).toContain("今日预估收益");
    expect(dashboardWxml).toContain("可提现金额");
    expect(dashboardWxml).toContain("排行榜");
    expect(dashboardWxml).toContain("门店二维码");
    expect(dashboardWxml).toContain("无权访问商家页面，已返回 WiFi 首页");
  });

  it("masks WiFi passwords by default and preserves compliant revenue wording", () => {
    const manualWxml = readMiniappFile("pages/manual-connect/index.wxml");
    expect(manualWxml).toContain("密码：{{passwordMasked}}（点击复制）");
    expect(manualWxml).not.toContain("密码：{{password}}");

    const allMiniappText = collectFiles(join(__dirname, "..", "pages"))
      .filter((file) => /\.(wxml|js|wxss)$/.test(file))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(allMiniappText).toContain("预估收益不等于可提现收益");
    expect(allMiniappText).toContain("门店 WiFi 暂未配置，请联系店员");
    expect(allMiniappText).not.toMatch(/躺赚|暴利|固定收益|投资回本|拉人返利/);
  });

  it("shows loading, empty, error, and forbidden states in key miniapp pages", () => {
    const pages = [
      readMiniappFile("pages/merchant/apply.wxml"),
      readMiniappFile("pages/merchant/application-status.wxml"),
      readMiniappFile("pages/merchant/withdraw.wxml"),
      readMiniappFile("pages/ranking/index.wxml"),
    ].join("\n");

    expect(pages).toContain("正在提交申请");
    expect(pages).toContain("暂无申请记录");
    expect(pages).toContain("提现规则加载失败");
    expect(pages).toContain("无权访问商家页面，已返回 WiFi 首页");
  });
});
