import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 05 scan ad rewardToken loop", () => {
  let app: INestApplication;
  let httpServer: unknown;
  const adminToken = "admin.mock.super_admin";

  beforeAll(async () => {
    app = await createApp();
    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const wxLogin = async (mockOpenid: string) => {
    const login = await request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: mockOpenid, mockOpenid })
      .expect(201);
    return login.body.data.token as string;
  };

  it("completes the mock scan, ad, reward token, connect info, and result loop", async () => {
    const token = await wxLogin("phase05_customer");

    const landing = await request(httpServer)
      .get("/api/store/landing")
      .set("Authorization", `Bearer ${token}`)
      .query({ scene: "STORE_1" })
      .expect(200);
    expect(landing.body.data).toMatchObject({
      storeId: 1,
      status: "wifi_ready",
      adRequired: true,
      connectButtonEnabled: true,
    });

    const scan = await request(httpServer)
      .post("/api/scan/report")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId: 1, scene: "STORE_1" })
      .expect(201);
    expect(scan.body.data.scanLogId).toBeGreaterThan(0);

    const adStart = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId: 1 })
      .expect(201);
    expect(adStart.body.data).toMatchObject({
      adMode: "mock",
      rewardTokenIssued: false,
    });
    expect(adStart.body.data.complianceNotice).toContain("完整观看");

    const adFinish = await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${token}`)
      .send({ viewNo: adStart.body.data.viewNo, isEnded: true })
      .expect(201);
    expect(adFinish.body.data).toMatchObject({
      isEffective: true,
      wifiConfigured: true,
    });
    expect(adFinish.body.data.rewardToken).toMatch(/^RT/);

    const rewardToken = await request(httpServer)
      .post("/api/wifi/reward-token")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId: 1, viewNo: adStart.body.data.viewNo })
      .expect(201);
    expect(rewardToken.body.data.rewardToken).toBe(adFinish.body.data.rewardToken);
    expect(rewardToken.body.data.reused).toBe(true);

    const connectInfo = await request(httpServer)
      .post("/api/wifi/connect-info")
      .set("Authorization", `Bearer ${token}`)
      .send({ rewardToken: adFinish.body.data.rewardToken })
      .expect(201);
    expect(connectInfo.body.data).toMatchObject({
      ssid: "Mock-WiFi",
      password: "12345678",
      securityType: "WPA2",
      connectMode: "mock",
    });
    expect(connectInfo.body.data.manualFallback.steps).toContain("返回首页");

    await request(httpServer)
      .post("/api/wifi/connect-info")
      .set("Authorization", `Bearer ${token}`)
      .send({ rewardToken: adFinish.body.data.rewardToken })
      .expect(400);

    const result = await request(httpServer)
      .post("/api/wifi/connect-result")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId: 1, rewardToken: adFinish.body.data.rewardToken, status: "success" })
      .expect(201);
    expect(result.body.data).toMatchObject({
      accepted: true,
      status: "success",
      manualFallback: false,
    });

    const dashboard = await request(httpServer)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(dashboard.body.data.todayScanUsers).toBeGreaterThanOrEqual(1);
    expect(dashboard.body.data.todayAdCompletes).toBeGreaterThanOrEqual(1);
    expect(dashboard.body.data.todayConnectSuccess).toBeGreaterThanOrEqual(1);
  });

  it("does not issue rewardToken for early ad close or cross-user access", async () => {
    const ownerToken = await wxLogin("phase05_owner");
    const otherToken = await wxLogin("phase05_other");

    const adStart = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ storeId: 1 })
      .expect(201);

    await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ viewNo: adStart.body.data.viewNo, isEnded: true })
      .expect(401);

    const earlyClose = await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ viewNo: adStart.body.data.viewNo, isEnded: false })
      .expect(201);
    expect(earlyClose.body.data).toMatchObject({
      isEffective: false,
      rewardToken: null,
    });

    await request(httpServer)
      .post("/api/wifi/reward-token")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ storeId: 1, viewNo: adStart.body.data.viewNo })
      .expect(400);
  });

  it("keeps missing WiFi out of the ad-required path", async () => {
    const store = await request(httpServer)
      .post("/api/admin/stores")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ merchantId: 1, name: "Phase 05 未配置 WiFi 门店", city: "上海" })
      .expect(201);
    const qrcode = await request(httpServer)
      .post("/api/admin/qrcode/generate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ storeId: store.body.data.id })
      .expect(201);
    const token = await wxLogin("phase05_missing_wifi_customer");

    const landing = await request(httpServer)
      .get("/api/store/landing")
      .set("Authorization", `Bearer ${token}`)
      .query({ scene: qrcode.body.data.scene })
      .expect(200);
    expect(landing.body.data).toMatchObject({
      status: "wifi_missing",
      adRequired: false,
      connectButtonEnabled: false,
      missingWifiText: "门店 WiFi 暂未配置，请联系店员",
    });

    await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId: store.body.data.id })
      .expect(400);
  });
});
