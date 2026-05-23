import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 06 commission revenue settlement", () => {
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

  const completeEffectiveAd = async (token: string, storeId: number) => {
    const view = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId })
      .expect(201);
    return request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${token}`)
      .send({ viewNo: view.body.data.viewNo, isEnded: true })
      .expect(201);
  };

  const createStoreWithWifi = async (name: string, shareRateBps?: number) => {
    const store = await request(httpServer)
      .post("/api/admin/stores")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        merchantId: 1,
        name,
        city: "上海",
        address: "Phase 06 测试路 6 号",
        industry: "餐饮",
        shareRateBps,
      })
      .expect(201);

    await request(httpServer)
      .post("/api/admin/wifi/save")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        storeId: store.body.data.id,
        ssid: `${name}-WiFi`,
        password: "phase06-mock-password",
        securityType: "WPA2",
        connectMode: "mock",
      })
      .expect(201);
    return store.body.data;
  };

  it("creates estimated revenue from effective mock ads without changing wallet availability", async () => {
    const customerToken = await wxLogin("phase06_customer_default_share");
    const finish = await completeEffectiveAd(customerToken, 1);

    expect(finish.body.data).toMatchObject({
      isEffective: true,
      estimatedMerchantAmountCent: 50,
      revenueEstimateNotice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
    });
    expect(finish.body.data.revenueNo).toMatch(/^R20260523/);

    const revenue = await request(httpServer)
      .get("/api/admin/revenue")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ status: "estimated" })
      .expect(200);
    const record = revenue.body.data.list.find((item: { revenueNo: string }) => item.revenueNo === finish.body.data.revenueNo);
    expect(record).toMatchObject({
      merchantId: 1,
      storeId: 1,
      grossAmountCent: 100,
      merchantAmountCent: 50,
      platformAmountCent: 50,
      appliedShareRateBps: 5000,
      shareRuleSource: "merchant",
      status: "estimated",
    });

    const merchantToken = await wxLogin("mock_merchant_active");
    const dashboard = await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(dashboard.body.data.todayEstimatedCent).toBeGreaterThanOrEqual(50);
    expect(dashboard.body.data.availableCent).toBe(0);
  });

  it("solidifies store share rate and confirms settlement through wallet_ledger", async () => {
    const store = await createStoreWithWifi("Phase 06 分成门店", 6000);
    const customerToken = await wxLogin("phase06_customer_store_share");
    const finish = await completeEffectiveAd(customerToken, store.id);
    expect(finish.body.data).toMatchObject({
      estimatedMerchantAmountCent: 60,
    });

    await request(httpServer)
      .post(`/api/admin/stores/${store.id}/share-rate`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ shareRateBps: 7000, reason: "future events only", confirm: true })
      .expect(201);

    const beforeConfirm = await request(httpServer)
      .get("/api/admin/revenue")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ status: "estimated" })
      .expect(200);
    const estimated = beforeConfirm.body.data.list.find(
      (item: { revenueNo: string }) => item.revenueNo === finish.body.data.revenueNo,
    );
    expect(estimated).toMatchObject({
      appliedShareRateBps: 6000,
      shareRuleSource: "store",
      shareRuleRefId: store.id,
      merchantAmountCent: 60,
      platformAmountCent: 40,
    });

    const operatorLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "operator", password: "mock" })
      .expect(201);
    await request(httpServer)
      .post("/api/admin/settlement/import")
      .set("Authorization", `Bearer ${operatorLogin.body.data.token}`)
      .send({ revenueNos: [finish.body.data.revenueNo], remark: "operator cannot confirm" })
      .expect(403);

    const financeLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "finance", password: "mock" })
      .expect(201);
    const settlement = await request(httpServer)
      .post("/api/admin/settlement/import")
      .set("Authorization", `Bearer ${financeLogin.body.data.token}`)
      .send({ revenueNos: [finish.body.data.revenueNo], remark: "Phase 06 mock settlement" })
      .expect(201);
    expect(settlement.body.data).toMatchObject({
      confirmed: 1,
      abnormal: 0,
      walletLedgerRequired: true,
    });
    expect(settlement.body.data.records[0]).toMatchObject({
      revenueNo: finish.body.data.revenueNo,
      status: "withdrawable",
      merchantAmountCent: 60,
    });

    const wallet = await request(httpServer)
      .get("/api/admin/wallets")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const merchantWallet = wallet.body.data.list.find((item: { merchantId: number }) => item.merchantId === 1);
    expect(merchantWallet.availableCent).toBeGreaterThanOrEqual(60);
    expect(merchantWallet.totalConfirmedCent).toBeGreaterThanOrEqual(60);

    const ledger = await request(httpServer)
      .get("/api/admin/wallets/1/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(ledger.body.data.list[0]).toMatchObject({
      ledgerType: "revenue_confirm",
      amountCent: 60,
      refType: "revenue_record",
      idempotencyKey: `revenue_confirm:${settlement.body.data.records[0].id}`,
    });

    const merchantToken = await wxLogin("mock_merchant_active");
    const merchantRevenue = await request(httpServer)
      .get("/api/merchant/revenue")
      .set("Authorization", `Bearer ${merchantToken}`)
      .query({ status: "withdrawable" })
      .expect(200);
    expect(merchantRevenue.body.data.list.some((item: { revenueNo: string }) => item.revenueNo === finish.body.data.revenueNo)).toBe(
      true,
    );
  });
});
