import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { encodeMockToken } from "../src/auth/role-context";
import { createApp } from "../src/main";

describe("Phase 03 login permissions and user routing", () => {
  let app: INestApplication;
  let httpServer: unknown;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const wxLogin = (mockOpenid: string) =>
    request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: mockOpenid, mockOpenid })
      .expect(201);

  it("routes ordinary customers only to the WiFi path", async () => {
    const login = await wxLogin("mock_customer");

    expect(login.body.data.roleContext).toMatchObject({
      openid: "mock_customer",
      isMerchantOwner: false,
      merchantStatus: "none",
      defaultLanding: "wifi",
      canViewMerchantPages: false,
      canWithdraw: false,
    });
    expect(login.body.data.routePolicy.merchantEntryText).toBe("商家申请");
    expect(login.body.data.routePolicy.allowedRoutes).toContain("pages/wifi/index");
    expect(login.body.data.routePolicy.allowedRoutes).not.toContain("pages/merchant/dashboard");

    await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(403);
  });

  it("routes active merchant owners to WiFi by default while exposing merchant center entry", async () => {
    const login = await wxLogin("mock_merchant_active");

    expect(login.body.data.roleContext).toMatchObject({
      openid: "mock_merchant_active",
      isMerchantOwner: true,
      merchantStatus: "active",
      merchantId: 1,
      defaultLanding: "wifi",
      canViewMerchantPages: true,
      canWithdraw: true,
    });
    expect(login.body.data.routePolicy.landingRoute).toBe("pages/wifi/index");
    expect(login.body.data.routePolicy.merchantEntryText).toBe("商家中心");
    expect(login.body.data.routePolicy.bottomTabs).toEqual(["WiFi", "商家", "排行榜", "我的"]);

    await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(200);
  });

  it("keeps pending, disabled, and risk-frozen merchant bindings out of merchant pages", async () => {
    const cases = [
      ["mock_merchant_pending", "pending", "申请进度"],
      ["mock_merchant_disabled", "disabled", "商家申请"],
      ["mock_merchant_risk_frozen", "risk_frozen", "商家申请"],
    ] as const;

    for (const [openid, status, entryText] of cases) {
      const login = await wxLogin(openid);
      expect(login.body.data.roleContext.merchantStatus).toBe(status);
      expect(login.body.data.roleContext.canViewMerchantPages).toBe(false);
      expect(login.body.data.routePolicy.merchantEntryText).toBe(entryText);
      await request(httpServer)
        .get("/api/merchant/dashboard")
        .set("Authorization", `Bearer ${login.body.data.token}`)
        .expect(403);
    }
  });

  it("recomputes /auth/me route policy from backend state", async () => {
    const login = await wxLogin("mock_merchant_active");
    const me = await request(httpServer)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .expect(200);

    expect(me.body.data.roleContext.canViewMerchantPages).toBe(true);
    expect(me.body.data.routePolicy.allowedRoutes).toContain("pages/merchant/dashboard");
  });

  it("does not trust forged merchant roleContext in a mock token", async () => {
    const forgedToken = encodeMockToken({
      openid: "mock_customer",
      roleContext: {
        openid: "mock_customer",
        isMerchantOwner: true,
        merchantStatus: "active",
        merchantId: 999,
        storeCount: 1,
        defaultLanding: "merchant_dashboard",
        canViewMerchantPages: true,
        canWithdraw: true,
      },
    });

    await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${forgedToken}`)
      .expect(403);
  });

  it("returns role-specific admin login permissions and rejects role header spoofing", async () => {
    const operatorLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "operator", password: "mock" })
      .expect(201);

    expect(operatorLogin.body.data.roles).toEqual(["operator"]);
    expect(operatorLogin.body.data.permissions).toContain("merchant.create");
    expect(operatorLogin.body.data.permissions).not.toContain("wallet.adjust");

    await request(httpServer)
      .post("/api/admin/merchants/1/share-rate")
      .set("Authorization", `Bearer ${operatorLogin.body.data.token}`)
      .set("x-admin-role", "finance")
      .send({ shareRateBps: 6000, reason: "spoof attempt", confirm: true })
      .expect(403);

    const financeLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "finance", password: "mock" })
      .expect(201);

    await request(httpServer)
      .post("/api/admin/merchants/1/share-rate")
      .set("Authorization", `Bearer ${financeLogin.body.data.token}`)
      .send({ shareRateBps: 6000, reason: "phase 03 finance", confirm: true })
      .expect(201);
  });

  it("rejects admin tokens on miniapp/customer APIs", async () => {
    await request(httpServer)
      .get("/api/auth/me")
      .set("Authorization", "Bearer admin.mock.super_admin")
      .expect(401);
  });
});
