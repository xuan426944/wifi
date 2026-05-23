import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAppConfig } from "../src/config/app-config";
import { createApp } from "../src/main";

describe("Phase 01 API scaffold", () => {
  let app: INestApplication;
  let httpServer: unknown;
  let customerToken: string;
  let merchantToken: string;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    httpServer = app.getHttpServer();

    const customerLogin = await request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: "customer", mockOpenid: "mock_customer" })
      .expect(201);
    customerToken = customerLogin.body.data.token;

    const merchantLogin = await request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: "merchant", mockOpenid: "mock_merchant_active" })
      .expect(201);
    merchantToken = merchantLogin.body.data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("uses mock defaults and does not require real third-party config", () => {
    const config = loadAppConfig({});
    expect(config.authMode).toBe("mock_wechat");
    expect(config.adMode).toBe("mock");
    expect(config.wifiMode).toBe("mock");
    expect(config.paymentMode).toBe("mock");
    expect(config.transferMode).toBe("mock");
    expect(config.storageMode).toBe("local");
    expect(config.notifyMode).toBe("mock");
  });

  it("keeps ordinary customer on WiFi path and blocks merchant pages", async () => {
    const landing = await request(httpServer)
      .get("/api/store/landing")
      .set("Authorization", `Bearer ${customerToken}`)
      .query({ scene: "STORE_1" })
      .expect(200);

    expect(landing.body.data.primaryAction).toBeUndefined();
    expect(landing.body.data.status).toBe("wifi_ready");

    const forbidden = await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${customerToken}`)
      .expect(403);
    expect(forbidden.body.code).toBe(403101);
  });

  it("allows active merchant owner to open merchant dashboard without changing default WiFi landing", async () => {
    const dashboard = await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);

    expect(dashboard.body.data.merchantName).toBe("Mock 商户");
    expect(dashboard.body.data.revenueEstimateNotice).toContain("预估收益不等于可提现收益");
  });

  it("runs the mock ad reward token WiFi flow", async () => {
    const start = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ storeId: 1 })
      .expect(201);

    const viewNo = start.body.data.viewNo;
    await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ viewNo, isEnded: true })
      .expect(201);

    const reward = await request(httpServer)
      .post("/api/wifi/reward-token")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ storeId: 1, viewNo })
      .expect(201);

    const connect = await request(httpServer)
      .post("/api/wifi/connect-info")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rewardToken: reward.body.data.rewardToken })
      .expect(201);

    expect(connect.body.data.ssid).toBe("Mock-WiFi");
    expect(connect.body.data.password).toBe("12345678");

    const result = await request(httpServer)
      .post("/api/wifi/connect-result")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ storeId: 1, rewardToken: reward.body.data.rewardToken, status: "success" })
      .expect(201);
    expect(result.body.data.accepted).toBe(true);
  });

  it("enforces admin RBAC and records high-risk operation logs", async () => {
    await request(httpServer)
      .post("/api/admin/merchants/1/share-rate")
      .set("Authorization", "Bearer admin.mock.operator")
      .send({ shareRateBps: 6000, reason: "phase 01 check", confirm: true })
      .expect(403);

    await request(httpServer)
      .post("/api/admin/merchants/1/share-rate")
      .set("Authorization", "Bearer admin.mock.finance")
      .send({ shareRateBps: 6000, reason: "phase 01 check", confirm: true })
      .expect(201);

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", "Bearer admin.mock.finance")
      .expect(200);
    expect(logs.body.data.list.some((item: { action: string }) => item.action === "merchant.share_rate.update")).toBe(true);
  });

  it("simulates mock callback signature verification", async () => {
    await request(httpServer)
      .post("/api/payment/wechat/transfer-notify")
      .send({ eventId: "evt_fail" })
      .expect(400);

    const ok = await request(httpServer)
      .post("/api/payment/wechat/transfer-notify")
      .set("x-mock-signature", "mock-signature")
      .send({ eventId: "evt_ok" })
      .expect(201);
    expect(ok.body.data.verifyStatus).toBe("mock");
  });
});
