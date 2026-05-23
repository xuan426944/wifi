import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 07 wallet withdraw mock transfer", () => {
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

  const createFullShareStore = async () => {
    const store = await request(httpServer)
      .post("/api/admin/stores")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ merchantId: 1, name: "Phase 07 提现门店", city: "上海", shareRateBps: 10000 })
      .expect(201);
    await request(httpServer)
      .post("/api/admin/wifi/save")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        storeId: store.body.data.id,
        ssid: "Phase07-WiFi",
        password: "phase07-mock-password",
        securityType: "WPA2",
        connectMode: "mock",
      })
      .expect(201);
    return store.body.data.id as number;
  };

  const completeEffectiveAd = async (token: string, storeId: number) => {
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
    return finish.body.data.revenueNo as string;
  };

  const seedWithdrawableRevenue = async (amountCent: number) => {
    const storeId = await createFullShareStore();
    const token = await wxLogin(`phase07_customer_${amountCent}`);
    const revenueNos: string[] = [];
    for (let index = 0; index < amountCent / 100; index += 1) {
      revenueNos.push(await completeEffectiveAd(token, storeId));
    }
    await request(httpServer)
      .post("/api/admin/settlement/import")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ revenueNos, remark: "Phase 07 mock settlement seed" })
      .expect(201);
  };

  it("freezes available balance on merchant withdraw apply and pays only after mock query confirmation", async () => {
    await seedWithdrawableRevenue(10000);
    const merchantToken = await wxLogin("mock_merchant_active");

    const apply = await request(httpServer)
      .post("/api/merchant/withdraw/apply")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ amountCent: 5000 })
      .expect(201);
    expect(apply.body.data).toMatchObject({
      merchantId: 1,
      amountCent: 5000,
      status: "frozen",
    });

    const walletAfterFreeze = await request(httpServer)
      .get("/api/admin/wallets")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const wallet = walletAfterFreeze.body.data.list.find((item: { merchantId: number }) => item.merchantId === 1);
    expect(wallet.availableCent).toBeGreaterThanOrEqual(5000);
    expect(wallet.frozenWithdrawCent).toBeGreaterThanOrEqual(5000);

    const financeLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "finance", password: "mock" })
      .expect(201);
    const approved = await request(httpServer)
      .post(`/api/admin/withdraws/${apply.body.data.id}/approve`)
      .set("Authorization", `Bearer ${financeLogin.body.data.token}`)
      .send({ reason: "Phase 07 mock transfer", confirm: true })
      .expect(201);
    expect(approved.body.data).toMatchObject({
      status: "transfer_processing",
      outBillNo: `MOCK_OUT_${apply.body.data.withdrawNo}`,
    });

    const queried = await request(httpServer)
      .post(`/api/admin/withdraws/${apply.body.data.id}/query-transfer`)
      .set("Authorization", `Bearer ${financeLogin.body.data.token}`)
      .send({})
      .expect(201);
    expect(queried.body.data).toMatchObject({
      status: "paid",
      remoteStatus: "paid",
      amountCent: 5000,
    });

    const ledger = await request(httpServer)
      .get("/api/admin/wallets/1/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    const ledgerTypes = ledger.body.data.list.map((item: { ledgerType: string }) => item.ledgerType);
    expect(ledgerTypes).toContain("withdraw_freeze");
    expect(ledgerTypes).toContain("withdraw_paid");

    const records = await request(httpServer)
      .get("/api/merchant/withdraws")
      .set("Authorization", `Bearer ${merchantToken}`)
      .expect(200);
    expect(records.body.data.list.some((item: { withdrawNo: string }) => item.withdrawNo === apply.body.data.withdrawNo)).toBe(true);
  });

  it("rejects withdraws by unfreezing through wallet_ledger", async () => {
    const merchantToken = await wxLogin("mock_merchant_active");
    const apply = await request(httpServer)
      .post("/api/merchant/withdraw/apply")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ amountCent: 5000 })
      .expect(201);

    const financeLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "finance", password: "mock" })
      .expect(201);
    const rejected = await request(httpServer)
      .post(`/api/admin/withdraws/${apply.body.data.id}/reject`)
      .set("Authorization", `Bearer ${financeLogin.body.data.token}`)
      .send({ reason: "Phase 07 reject test", confirm: true })
      .expect(201);
    expect(rejected.body.data).toMatchObject({
      status: "rejected",
      failReason: "Phase 07 reject test",
    });

    const ledger = await request(httpServer)
      .get("/api/admin/wallets/1/ledger")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(ledger.body.data.list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ledgerType: "withdraw_failed_unfreeze",
          amountCent: 5000,
          refType: "withdraw_record",
        }),
      ]),
    );
  });

  it("blocks ordinary customers and insufficient balances from withdrawing", async () => {
    const customerToken = await wxLogin("phase07_plain_customer");
    await request(httpServer)
      .post("/api/merchant/withdraw/apply")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ amountCent: 5000 })
      .expect(403);

    const merchantToken = await wxLogin("mock_merchant_active");
    await request(httpServer)
      .post("/api/merchant/withdraw/apply")
      .set("Authorization", `Bearer ${merchantToken}`)
      .send({ amountCent: 99999999 })
      .expect(400);
  });
});
