import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 04 merchant store WiFi configuration", () => {
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

  const adminPost = (path: string) =>
    request(httpServer)
      .post(path)
      .set("Authorization", `Bearer ${superAdminToken}`);

  const adminGet = (path: string) =>
    request(httpServer)
      .get(path)
      .set("Authorization", `Bearer ${superAdminToken}`);

  const createStore = (name: string) =>
    adminPost("/api/admin/stores").send({
      merchantId: 1,
      name,
      city: "上海",
      district: "浦东新区",
      address: "Phase 04 测试路 4 号",
      industry: "餐饮",
      contactName: "店长",
      contactPhone: "13800000004",
    });

  const wxLogin = async (mockOpenid: string) => {
    const login = await request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: mockOpenid, mockOpenid })
      .expect(201);
    return login.body.data.token as string;
  };

  it("manages store rows with WiFi and qrcode statuses", async () => {
    const created = await createStore("Phase 04 二维码门店").expect(201);
    expect(created.body.data).toMatchObject({
      merchantName: "Mock 商户",
      wifiStatus: "未配置",
      qrcodeStatus: "未生成",
    });

    const qrcode = await adminPost("/api/admin/qrcode/generate")
      .send({ storeId: created.body.data.id })
      .expect(201);
    expect(qrcode.body.data).toMatchObject({
      storeId: created.body.data.id,
      scene: `STORE_${created.body.data.id}`,
      status: "active",
    });
    expect(qrcode.body.data.qrcodeUrl).toContain(`/mock/qrcode/STORE_${created.body.data.id}.png`);

    const detail = await adminGet(`/api/admin/stores/${created.body.data.id}`).expect(200);
    expect(detail.body.data).toMatchObject({
      wifiStatus: "未配置",
      qrcodeStatus: "已生成",
    });

    const logs = await adminGet("/api/admin/operation-logs").expect(200);
    const actions = logs.body.data.list.map((log: { action: string }) => log.action);
    expect(actions).toContain("store.create");
    expect(actions).toContain("qrcode.generate");
  });

  it("validates WiFi saves, masks passwords, and restricts password copying", async () => {
    const store = await createStore("Phase 04 WiFi 门店").expect(201);

    await adminPost("/api/admin/wifi/save")
      .send({
        storeId: store.body.data.id,
        ssid: "NoPassword-WiFi",
        securityType: "WPA2",
        connectMode: "mock",
      })
      .expect(400);

    const wifi = await adminPost("/api/admin/wifi/save")
      .send({
        storeId: store.body.data.id,
        ssid: "Phase04-WiFi",
        password: "phase04-secret",
        securityType: "WPA2",
        connectMode: "mock",
        isPrimary: true,
        isEnabled: true,
        allowCopyPassword: true,
        showManualFallback: true,
        passwordViewPolicy: "copy_only",
      })
      .expect(201);

    expect(wifi.body.data.passwordMasked).not.toBe("phase04-secret");
    expect(wifi.body.data.passwordCipher).toBeUndefined();
    expect(wifi.body.data.password).toBeUndefined();

    const edited = await adminPost("/api/admin/wifi/save")
      .send({
        id: wifi.body.data.id,
        storeId: store.body.data.id,
        ssid: "Phase04-WiFi-Edited",
        securityType: "WPA2",
        connectMode: "mock",
      })
      .expect(201);
    expect(edited.body.data.passwordMasked).toBe(wifi.body.data.passwordMasked);

    const operatorLogin = await request(httpServer)
      .post("/api/admin/login")
      .send({ username: "operator", password: "mock" })
      .expect(201);
    await request(httpServer)
      .post(`/api/admin/wifi/${wifi.body.data.id}/copy-password`)
      .set("Authorization", `Bearer ${operatorLogin.body.data.token}`)
      .send({ reason: "operator should not view plain password", confirm: true })
      .expect(403);

    const copied = await adminPost(`/api/admin/wifi/${wifi.body.data.id}/copy-password`)
      .send({ reason: "现场协助连接", confirm: true })
      .expect(201);
    expect(copied.body.data).toMatchObject({
      ssid: "Phase04-WiFi-Edited",
      password: "phase04-secret",
      securityType: "WPA2",
    });

    const logs = await adminGet("/api/admin/operation-logs").expect(200);
    const serializedLogs = JSON.stringify(logs.body.data.list);
    expect(serializedLogs).toContain("wifi.password.copy");
    expect(serializedLogs).not.toContain("phase04-secret");
  });

  it("serves configured WiFi through landing and reward-token connect info", async () => {
    const store = await createStore("Phase 04 扫码门店").expect(201);
    const wifi = await adminPost("/api/admin/wifi/save")
      .send({
        storeId: store.body.data.id,
        ssid: "Phase04-Scan-WiFi",
        password: "scan-secret",
        securityType: "WPA2",
        connectMode: "mock",
        isPrimary: true,
        isEnabled: true,
        allowCopyPassword: true,
        showManualFallback: true,
        passwordViewPolicy: "never_plain",
      })
      .expect(201);
    const qrcode = await adminPost("/api/admin/qrcode/generate")
      .send({ storeId: store.body.data.id })
      .expect(201);
    const customerToken = await wxLogin("phase04_customer");

    const readyLanding = await request(httpServer)
      .get("/api/store/landing")
      .set("Authorization", `Bearer ${customerToken}`)
      .query({ scene: qrcode.body.data.scene })
      .expect(200);
    expect(readyLanding.body.data).toMatchObject({
      storeId: store.body.data.id,
      wifiName: "Phase04-Scan-WiFi",
      status: "wifi_ready",
      adRequired: true,
      connectButtonEnabled: true,
    });

    await adminPost(`/api/admin/wifi/${wifi.body.data.id}/disable`)
      .send({ reason: "Phase 04 missing WiFi landing test", confirm: true })
      .expect(201);
    const missingLanding = await request(httpServer)
      .get("/api/store/landing")
      .set("Authorization", `Bearer ${customerToken}`)
      .query({ scene: qrcode.body.data.scene })
      .expect(200);
    expect(missingLanding.body.data).toMatchObject({
      status: "wifi_missing",
      adRequired: false,
      connectButtonEnabled: false,
      missingWifiText: "门店 WiFi 暂未配置，请联系店员",
    });

    await adminPost(`/api/admin/wifi/${wifi.body.data.id}/enable`)
      .send({ reason: "Phase 04 connect-info test", confirm: true })
      .expect(201);
    const view = await request(httpServer)
      .post("/api/ad/view/start")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ storeId: store.body.data.id })
      .expect(201);
    await request(httpServer)
      .post("/api/ad/view/finish")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ viewNo: view.body.data.viewNo, isEnded: true })
      .expect(201);
    const rewardToken = await request(httpServer)
      .post("/api/wifi/reward-token")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ storeId: store.body.data.id, viewNo: view.body.data.viewNo })
      .expect(201);
    const connectInfo = await request(httpServer)
      .post("/api/wifi/connect-info")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ rewardToken: rewardToken.body.data.rewardToken })
      .expect(201);

    expect(connectInfo.body.data).toMatchObject({
      ssid: "Phase04-Scan-WiFi",
      password: "scan-secret",
      securityType: "WPA2",
      connectMode: "mock",
    });
    expect(connectInfo.body.data.manualFallback.steps).toContain("返回首页");
  });
});
