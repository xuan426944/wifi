import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 12 mock integration acceptance", () => {
  let app: INestApplication;
  let httpServer: unknown;
  const superAdminToken = "admin.mock.super_admin";

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
    return {
      token: login.body.data.token as string,
      roleContext: login.body.data.roleContext as {
        defaultLanding: string;
        canViewMerchantPages: boolean;
        canWithdraw: boolean;
      },
    };
  };

  const adminLogin = async (username: string) => {
    const login = await request(httpServer).post("/api/admin/login").send({ username, password: "mock" }).expect(201);
    return login.body.data.token as string;
  };

  const createAcceptanceStore = async () => {
    const store = await request(httpServer)
      .post("/api/admin/stores")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        merchantId: 1,
        name: "Phase 12 Acceptance Store",
        city: "Shanghai",
        industry: "Food",
        shareRateBps: 10000,
      })
      .expect(201);

    await request(httpServer)
      .post("/api/admin/wifi/save")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        storeId: store.body.data.id,
        ssid: "Phase12-WiFi",
        password: "phase12-mock-password",
        securityType: "WPA2",
        connectMode: "mock",
      })
      .expect(201);

    const qrcode = await request(httpServer)
      .post("/api/admin/qrcode/generate")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ storeId: store.body.data.id })
      .expect(201);

    return {
      storeId: store.body.data.id as number,
      scene: qrcode.body.data.scene as string,
    };
  };

  const completeEffectiveAd = async (token: string, storeId: number) => {
    const view = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeId })
      .expect(201);
    expect(view.body.data).toMatchObject({
      adMode: "mock",
      adUnitId: "mock-reward-ad-unit",
      rewardTokenIssued: false,
    });

    const finish = await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${token}`)
      .send({ viewNo: view.body.data.viewNo, isEnded: true })
      .expect(201);
    expect(finish.body.data).toMatchObject({
      isEffective: true,
      wifiConfigured: true,
      estimatedMerchantAmountCent: 100,
    });
    expect(finish.body.data.revenueEstimateNotice).toBeTruthy();
    return {
      viewNo: view.body.data.viewNo as string,
      revenueNo: finish.body.data.revenueNo as string,
      rewardToken: finish.body.data.rewardToken as string,
    };
  };

  it("runs the customer ad WiFi merchant settlement withdraw flow in mock mode", async () => {
    const { storeId, scene } = await createAcceptanceStore();
    const customer = await wxLogin("phase12_customer_full_flow");

    const landing = await request(httpServer)
      .get(`/api/store/landing?scene=${scene}`)
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);
    expect(landing.body.data).toMatchObject({
      storeId,
      wifiName: "Phase12-WiFi",
      status: "wifi_ready",
      adRequired: true,
      connectButtonEnabled: true,
      merchantEntryPlacement: "bottom_right",
    });

    await request(httpServer)
      .post("/api/scan/report")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ storeId, scene })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ accepted: true, storeId, scene });
      });

    const earlyView = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ storeId })
      .expect(201);
    await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ viewNo: earlyView.body.data.viewNo, isEnded: false })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ isEffective: false, rewardToken: null });
      });
    await request(httpServer)
      .post("/api/wifi/connect-info")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ rewardToken: "invalid-phase12-token" })
      .expect(400);

    const revenueNos: string[] = [];
    const firstAd = await completeEffectiveAd(customer.token, storeId);
    revenueNos.push(firstAd.revenueNo);

    const connectInfo = await request(httpServer)
      .post("/api/wifi/connect-info")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ rewardToken: firstAd.rewardToken })
      .expect(201);
    expect(connectInfo.body.data).toMatchObject({
      ssid: "Phase12-WiFi",
      password: "phase12-mock-password",
      securityType: "WPA2",
      connectMode: "mock",
    });

    await request(httpServer)
      .post("/api/wifi/connect-result")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ storeId, rewardToken: firstAd.rewardToken, status: "success" })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ accepted: true, status: "success", manualFallback: false });
      });

    await request(httpServer).get("/api/merchant/dashboard").set("Authorization", `Bearer ${customer.token}`).expect(403);

    const merchant = await wxLogin("mock_merchant_active");
    expect(merchant.roleContext).toMatchObject({
      defaultLanding: "wifi",
      canViewMerchantPages: true,
      canWithdraw: true,
    });

    const beforeSettlement = await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${merchant.token}`)
      .expect(200);
    expect(beforeSettlement.body.data.availableCent).toBe(0);
    expect(beforeSettlement.body.data.todayEstimatedCent).toBeGreaterThanOrEqual(100);

    for (let index = 1; index < 50; index += 1) {
      const ad = await completeEffectiveAd(customer.token, storeId);
      revenueNos.push(ad.revenueNo);
    }

    const operatorToken = await adminLogin("operator");
    await request(httpServer)
      .post("/api/admin/settlement/import")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ revenueNos, remark: "Phase 12 operator must not settle" })
      .expect(403);

    const financeToken = await adminLogin("finance");
    const settlement = await request(httpServer)
      .post("/api/admin/settlement/import")
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ revenueNos, remark: "Phase 12 mock acceptance settlement" })
      .expect(201);
    expect(settlement.body.data).toMatchObject({
      imported: 50,
      confirmed: 50,
      abnormal: 0,
      walletLedgerRequired: true,
    });

    const afterSettlement = await request(httpServer)
      .get("/api/merchant/dashboard")
      .set("Authorization", `Bearer ${merchant.token}`)
      .expect(200);
    expect(afterSettlement.body.data.availableCent).toBeGreaterThanOrEqual(5000);
    expect(afterSettlement.body.data.revenueEstimateNotice).toBeTruthy();

    const withdraw = await request(httpServer)
      .post("/api/merchant/withdraw/apply")
      .set("Authorization", `Bearer ${merchant.token}`)
      .send({ amountCent: 5000 })
      .expect(201);
    expect(withdraw.body.data).toMatchObject({
      merchantId: 1,
      amountCent: 5000,
      status: "frozen",
    });

    await request(httpServer)
      .post(`/api/admin/withdraws/${withdraw.body.data.id}/approve`)
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ reason: "missing confirm" })
      .expect(400);

    const approved = await request(httpServer)
      .post(`/api/admin/withdraws/${withdraw.body.data.id}/approve`)
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ reason: "Phase 12 mock transfer approval", confirm: true })
      .expect(201);
    expect(approved.body.data).toMatchObject({
      status: "transfer_processing",
      outBillNo: `MOCK_OUT_${withdraw.body.data.withdrawNo}`,
    });

    const paid = await request(httpServer)
      .post(`/api/admin/withdraws/${withdraw.body.data.id}/query-transfer`)
      .set("Authorization", `Bearer ${financeToken}`)
      .send({})
      .expect(201);
    expect(paid.body.data).toMatchObject({
      status: "paid",
      remoteStatus: "paid",
      amountCent: 5000,
    });

    const ledger = await request(httpServer)
      .get("/api/admin/wallets/1/ledger")
      .set("Authorization", `Bearer ${financeToken}`)
      .expect(200);
    const ledgerTypes = ledger.body.data.list.map((item: { ledgerType: string }) => item.ledgerType);
    expect(ledgerTypes).toEqual(expect.arrayContaining(["revenue_confirm", "withdraw_freeze", "withdraw_paid"]));

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", `Bearer ${financeToken}`)
      .expect(200);
    expect(logs.body.data.list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "settlement.import", targetType: "settlement" }),
        expect.objectContaining({ action: "withdraw.approve", targetType: "withdraw" }),
        expect.objectContaining({ action: "withdraw.query_transfer", targetType: "withdraw" }),
      ]),
    );
  });

  it("accepts mock admin readiness, reconciliation, notify signature, ranking, and risk checks", async () => {
    const readonlyToken = await adminLogin("readonly_audit");
    const financeToken = await adminLogin("finance");
    const riskToken = await adminLogin("risk");
    const merchant = await wxLogin("mock_merchant_active");
    const customer = await wxLogin("phase12_customer_risk_checks");

    const config = await request(httpServer)
      .get("/api/admin/system/config")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .expect(200);
    expect(config.body.data).toMatchObject({
      mockAdapterModes: {
        authMode: "mock_wechat",
        adMode: "mock",
        wifiMode: "mock",
        paymentMode: "mock",
        transferMode: "mock",
        storageMode: "local",
        notifyMode: "mock",
      },
      productionReadiness: {
        readyForDevelopment: true,
        readyForProduction: false,
      },
    });

    const integrations = await request(httpServer)
      .get("/api/admin/integrations/status")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .expect(200);
    expect(integrations.body.data).toMatchObject({
      readyForDevelopment: true,
      readyForProduction: false,
      mockAdapterActive: true,
      sensitiveMasked: true,
    });

    await request(httpServer)
      .post("/api/admin/reconciliation/run")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ type: "wallet_ledger", remark: "readonly must not reconcile" })
      .expect(403);
    await request(httpServer)
      .post("/api/admin/reconciliation/run")
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ type: "wallet_ledger", remark: "Phase 12 mock reconciliation" })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({
          status: "mock_completed",
          mockDifferenceSupported: true,
        });
      });

    await request(httpServer).post("/api/payment/wechat/transfer-notify").send({ eventId: "phase12" }).expect(400);
    await request(httpServer)
      .post("/api/payment/wechat/transfer-notify")
      .set("x-mock-signature", "mock-signature")
      .send({ eventId: "phase12" })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ verifyStatus: "mock", processStatus: "processed" });
      });

    await request(httpServer).get("/api/ranking/store?type=today_revenue").set("Authorization", `Bearer ${customer.token}`).expect(403);
    await request(httpServer)
      .get("/api/ranking/store?type=today_revenue")
      .set("Authorization", `Bearer ${merchant.token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.displayMode).toBeTruthy();
        expect(response.body.data).toHaveProperty("list");
      });

    for (let index = 0; index < 3; index += 1) {
      await request(httpServer)
        .post("/api/wifi/connect-result")
        .set("Authorization", `Bearer ${customer.token}`)
        .send({ storeId: 1, status: "failed", failReason: "phase12 mock risk failure" })
        .expect(201);
    }

    const events = await request(httpServer)
      .get("/api/admin/risk/events?status=open")
      .set("Authorization", `Bearer ${riskToken}`)
      .expect(200);
    expect(events.body.data.list[0]).toMatchObject({ riskType: "connect_fail_rate_high", status: "open" });

    await request(httpServer)
      .post(`/api/admin/risk/events/${events.body.data.list[0].id}/handle`)
      .set("Authorization", `Bearer ${riskToken}`)
      .send({ action: "disable_store", remark: "Phase 12 risk acceptance" })
      .expect(400);
    await request(httpServer)
      .post(`/api/admin/risk/events/${events.body.data.list[0].id}/handle`)
      .set("Authorization", `Bearer ${riskToken}`)
      .send({ action: "disable_store", remark: "Phase 12 risk acceptance", confirm: true })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ status: "handled", handledBy: "risk" });
      });
  });
});
