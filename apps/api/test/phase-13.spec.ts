import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 13 merchant onboarding compliance reconciliation enhancement", () => {
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

  const wxLogin = async (mockOpenid: string) => {
    const login = await request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: mockOpenid, mockOpenid })
      .expect(201);
    return {
      token: login.body.data.token as string,
      roleContext: login.body.data.roleContext as { defaultLanding: string; canViewMerchantPages: boolean },
    };
  };

  const adminLogin = async (username: string) => {
    const login = await request(httpServer).post("/api/admin/login").send({ username, password: "mock" }).expect(201);
    return login.body.data.token as string;
  };

  it("submits merchant onboarding and approves it into merchant, store, owner binding, and optional mock WiFi", async () => {
    const customer = await wxLogin("phase13_onboarding_openid");
    expect(customer.roleContext).toMatchObject({ defaultLanding: "wifi", canViewMerchantPages: false });

    const submit = await request(httpServer)
      .post("/api/merchant/applications")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        merchantName: "Phase 13 Merchant",
        applicantName: "Phase Applicant",
        applicantPhone: "13900000013",
        storeName: "Phase 13 Store",
        city: "Shanghai",
        district: "Pudong",
        address: "Phase 13 Road 1",
        industry: "Food",
        wifiSsid: "Phase13-WiFi",
        wifiPassword: "phase13-mock-password",
        remark: "Phase 13 mock/manual phone onboarding",
        agreeMerchantTerms: true,
      })
      .expect(201);
    expect(submit.body.data).toMatchObject({
      status: "submitted",
      applicantPhoneMasked: "139****0013",
      wifiProvided: true,
      sensitiveMasked: true,
      manualPhoneSupported: true,
      mockAdapterMode: true,
    });
    const applicationNo = submit.body.data.applicationNo as string;

    const duplicate = await request(httpServer)
      .post("/api/merchant/applications")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        applicantName: "Phase Applicant",
        applicantPhone: "13900000013",
        storeName: "Phase 13 Duplicate",
        city: "Shanghai",
        address: "Phase 13 Road 1",
        industry: "Food",
        agreeMerchantTerms: true,
      })
      .expect(201);
    expect(duplicate.body.data).toMatchObject({ applicationNo, duplicateBlocked: true });

    const latest = await request(httpServer)
      .get("/api/merchant/applications/my/latest")
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);
    expect(latest.body.data).toMatchObject({
      hasActiveMerchant: false,
      latestApplicationStatus: "submitted",
      entryAction: "application_status",
      wifiOptional: true,
    });

    const readonlyToken = await adminLogin("readonly_audit");
    await request(httpServer)
      .post(`/api/admin/merchant-applications/${applicationNo}/approve`)
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ reviewRemark: "readonly must not approve", confirm: true })
      .expect(403);

    const operatorToken = await adminLogin("operator");
    const list = await request(httpServer)
      .get("/api/admin/merchant-applications?status=submitted")
      .set("Authorization", `Bearer ${operatorToken}`)
      .expect(200);
    expect(list.body.data.list).toEqual(
      expect.arrayContaining([expect.objectContaining({ applicationNo, wifiProvided: true })]),
    );

    await request(httpServer)
      .post(`/api/admin/merchant-applications/${applicationNo}/approve`)
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ reviewRemark: "missing confirm" })
      .expect(400);

    const approved = await request(httpServer)
      .post(`/api/admin/merchant-applications/${applicationNo}/approve`)
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        reviewRemark: "Phase 13 approve with optional WiFi",
        confirm: true,
        createMerchant: true,
        createStore: true,
        bindOwner: true,
        createWifiIfProvided: true,
        merchantShareRateBps: 5000,
      })
      .expect(201);
    expect(approved.body.data).toMatchObject({
      status: "approved",
      ownerBound: true,
      wifiCreated: true,
      qrcodeCreated: true,
      mockAdapterMode: true,
    });
    expect(approved.body.data.createdMerchantId).toBeGreaterThan(0);
    expect(approved.body.data.createdStoreId).toBeGreaterThan(0);

    const merchant = await wxLogin("phase13_onboarding_openid");
    expect(merchant.roleContext).toMatchObject({ defaultLanding: "wifi", canViewMerchantPages: true });
    await request(httpServer).get("/api/merchant/dashboard").set("Authorization", `Bearer ${merchant.token}`).expect(200);

    const wifiList = await request(httpServer).get("/api/admin/wifi").set("Authorization", `Bearer ${operatorToken}`).expect(200);
    expect(wifiList.body.data.list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storeId: approved.body.data.createdStoreId,
          ssid: "Phase13-WiFi",
          passwordMasked: "************",
          connectMode: "mock",
        }),
      ]),
    );
    expect(JSON.stringify(wifiList.body.data.list)).not.toContain("phase13-mock-password");

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", `Bearer ${operatorToken}`)
      .expect(200);
    expect(logs.body.data.list).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "merchant_application.approve" })]),
    );
  });

  it("rejects and cancels applications without real phone or WeChat configuration", async () => {
    const customer = await wxLogin("phase13_reject_openid");
    await request(httpServer)
      .post("/api/merchant/applications")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        applicantName: "Reject Applicant",
        applicantPhone: "13900000014",
        storeName: "Reject Store",
        city: "Shanghai",
        address: "Reject Road 1",
        industry: "Food",
        agreeMerchantTerms: false,
      })
      .expect(400);

    const submit = await request(httpServer)
      .post("/api/merchant/applications")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({
        applicantName: "Reject Applicant",
        applicantPhone: "13900000014",
        storeName: "Reject Store",
        city: "Shanghai",
        address: "Reject Road 1",
        industry: "Food",
        agreeMerchantTerms: true,
      })
      .expect(201);

    const operatorToken = await adminLogin("operator");
    await request(httpServer)
      .post(`/api/admin/merchant-applications/${submit.body.data.applicationNo}/reject`)
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ rejectReason: "missing confirm" })
      .expect(400);

    const rejected = await request(httpServer)
      .post(`/api/admin/merchant-applications/${submit.body.data.applicationNo}/reject`)
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ rejectReason: "Phase 13 mock reject", allowResubmit: true, confirm: true })
      .expect(201);
    expect(rejected.body.data).toMatchObject({
      status: "rejected",
      rejectReason: "Phase 13 mock reject",
      allowResubmit: true,
    });

    await request(httpServer)
      .post(`/api/merchant/applications/${submit.body.data.applicationNo}/cancel`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({})
      .expect(400);
  });

  it("serves exact ad compliance copy and enhanced mock reconciliation differences", async () => {
    const customer = await wxLogin("phase13_compliance_openid");

    const landing = await request(httpServer)
      .get("/api/store/landing?scene=STORE_1")
      .set("Authorization", `Bearer ${customer.token}`)
      .expect(200);
    expect(landing.body.data).toMatchObject({
      merchantEntryPlacement: "bottom_right",
      merchantEntryText: "商家申请",
      adRequiredText: "观看广告后可获得本次 WiFi 连接授权。如广告暂不可用，可稍后重试或联系店员。",
    });

    const start = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ storeId: 1 })
      .expect(201);
    expect(start.body.data.complianceNotice).toContain("用户主动点击");
    expect(start.body.data.noFillText).toBe("当前广告暂不可用，请稍后重试。");

    const early = await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ viewNo: start.body.data.viewNo, isEnded: false })
      .expect(201);
    expect(early.body.data).toMatchObject({
      isEffective: false,
      rewardToken: null,
      adComplianceText: "广告未完整观看，暂不能获取自动连接授权。",
    });

    const financeToken = await adminLogin("finance");
    const readonlyToken = await adminLogin("readonly_audit");
    await request(httpServer)
      .post("/api/admin/reconciliation/run")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ type: "withdraw", scenario: "all_mock_differences" })
      .expect(403);

    const run = await request(httpServer)
      .post("/api/admin/reconciliation/run")
      .set("Authorization", `Bearer ${financeToken}`)
      .send({
        type: "withdraw",
        bizDate: "2026-05-23",
        scenario: "all_mock_differences",
        remark: "Phase 13 mock difference suite",
      })
      .expect(201);
    expect(run.body.data).toMatchObject({
      type: "withdraw",
      status: "mock_completed",
      mockDifferenceSupported: true,
    });
    const scenarios = run.body.data.records.map((record: { scenario: string }) => record.scenario);
    expect(new Set(scenarios).size).toBeGreaterThanOrEqual(5);
    expect(scenarios).toEqual(
      expect.arrayContaining([
        "local_paid_remote_failed",
        "local_processing_remote_paid",
        "local_failed_remote_paid",
        "amount_mismatch",
        "missing_remote",
        "duplicate_callback",
      ]),
    );
    expect(run.body.data.abnormalCount).toBeGreaterThanOrEqual(3);

    const list = await request(httpServer)
      .get("/api/admin/reconciliation")
      .set("Authorization", `Bearer ${financeToken}`)
      .expect(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(6);
    expect(list.body.data.mockDifferenceTypes).toEqual(expect.arrayContaining(["amount_mismatch", "duplicate_callback"]));
  });
});
