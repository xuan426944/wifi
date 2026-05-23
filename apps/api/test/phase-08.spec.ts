import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 08 ranking risk audit", () => {
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

  const createStoreWithWifi = async (name: string) => {
    const store = await request(httpServer)
      .post("/api/admin/stores")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ merchantId: 1, name, city: "上海", industry: "餐饮", shareRateBps: 10000 })
      .expect(201);
    await request(httpServer)
      .post("/api/admin/wifi/save")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        storeId: store.body.data.id,
        ssid: `${name}-WiFi`,
        password: "phase08-mock-password",
        securityType: "WPA2",
        connectMode: "mock",
      })
      .expect(201);
    return store.body.data.id as number;
  };

  const completeAds = async (token: string, storeId: number, count: number) => {
    const revenueNos: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const view = await request(httpServer)
        .post("/api/ad/view/start")
        .set("Authorization", `Bearer ${token}`)
        .send({ storeId })
        .expect(201);
      const finish = await request(httpServer)
        .post("/api/ad/view/finish")
        .set("Authorization", `Bearer ${token}`)
        .send({ viewNo: view.body.data.viewNo, isEnded: true })
        .expect(201);
      revenueNos.push(finish.body.data.revenueNo);
    }
    return revenueNos;
  };

  it("serves merchant rankings from mock revenue and saves display config with audit logs", async () => {
    const topStoreId = await createStoreWithWifi("Phase 08 高榜门店");
    const lowerStoreId = await createStoreWithWifi("Phase 08 次榜门店");
    const customerToken = await wxLogin("phase08_ranking_customer");
    await completeAds(customerToken, topStoreId, 3);
    await completeAds(customerToken, lowerStoreId, 1);

    const operatorLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "operator", password: "mock" })
      .expect(201);
    const saved = await request(httpServer)
      .post("/api/admin/ranking/config")
      .set("Authorization", `Bearer ${operatorLogin.body.data.token}`)
      .send({
        enabled: true,
        enabledTypes: ["today_revenue", "ad_complete_count"],
        limit: 5,
        amountDisplayMode: "heat",
        hideRiskStores: true,
        visibleScope: "global",
      })
      .expect(201);
    expect(saved.body.data.config).toMatchObject({ amountDisplayMode: "heat", limit: 5 });

    const readonlyLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "readonly_audit", password: "mock" })
      .expect(201);
    await request(httpServer)
      .post("/api/admin/ranking/config")
      .set("Authorization", `Bearer ${readonlyLogin.body.data.token}`)
      .send({ amountDisplayMode: "exact" })
      .expect(403);

    const merchantToken = await wxLogin("mock_merchant_active");
    const ranking = await request(httpServer)
      .get("/api/ranking/store?type=today_revenue")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(ranking.body.data).toMatchObject({ displayMode: "heat", myRank: 1, emptyState: false });
    expect(ranking.body.data.list[0]).toMatchObject({
      rank: 1,
      storeId: topStoreId,
      valueDisplay: expect.stringContaining("热度"),
    });
    expect(ranking.body.data.list[0]).not.toHaveProperty("score");

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(logs.body.data.list).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "ranking.config.save", targetType: "ranking_config" })]),
    );
  });

  it("creates mock risk events from failed WiFi connections and records handling audit logs", async () => {
    const customerToken = await wxLogin("phase08_risk_customer");
    for (let index = 0; index < 3; index += 1) {
      await request(httpServer)
        .post("/api/wifi/connect-result")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ storeId: 1, status: "failed", failReason: "phase08 mock failure" })
        .expect(201);
    }

    const riskLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "risk", password: "mock" })
      .expect(201);
    const events = await request(httpServer)
      .get("/api/admin/risk/events?status=open")
      .set("Authorization", `Bearer ${riskLogin.body.data.token}`)
      .expect(200);
    expect(events.body.data.list[0]).toMatchObject({
      riskType: "connect_fail_rate_high",
      status: "open",
      storeId: 1,
    });

    await request(httpServer)
      .post(`/api/admin/risk/events/${events.body.data.list[0].id}/handle`)
      .set("Authorization", `Bearer ${riskLogin.body.data.token}`)
      .send({ action: "disable_store", remark: "missing confirm" })
      .expect(400);

    const handled = await request(httpServer)
      .post(`/api/admin/risk/events/${events.body.data.list[0].id}/handle`)
      .set("Authorization", `Bearer ${riskLogin.body.data.token}`)
      .send({ action: "disable_store", remark: "Phase 08 mock risk handling", confirm: true })
      .expect(201);
    expect(handled.body.data).toMatchObject({
      status: "handled",
      handledAction: "disable_store",
      handledBy: "risk",
    });

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", `Bearer ${riskLogin.body.data.token}`)
      .expect(200);
    expect(logs.body.data.list).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "risk.handle", targetType: "risk_event" })]),
    );
  });
});
