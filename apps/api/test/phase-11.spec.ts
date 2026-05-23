import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 11 deployment config center and integration status", () => {
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

  const adminLogin = async (username: string) => {
    const login = await request(httpServer).post("/api/admin/login").send({ username, password: "mock" }).expect(201);
    return login.body.data.token as string;
  };

  it("returns the full mock-first config dictionary with sensitive values masked", async () => {
    const readonlyToken = await adminLogin("readonly_audit");

    const response = await request(httpServer)
      .get("/api/admin/system/config")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .expect(200);

    expect(response.body.data.mockAdapterModes).toMatchObject({
      authMode: "mock_wechat",
      adMode: "mock",
      wifiMode: "mock",
      paymentMode: "mock",
      transferMode: "mock",
      storageMode: "local",
      notifyMode: "mock",
    });
    expect(response.body.data.productionReadiness).toMatchObject({
      readyForDevelopment: true,
      readyForProduction: false,
    });
    expect(response.body.data.productionReadiness.missingProductionItems).toEqual(
      expect.arrayContaining(["WECHAT_APP_ID", "WECHAT_APP_SECRET", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY"]),
    );

    const configs = response.body.data.configs as Array<{ key: string; value: unknown; sensitive: boolean; editableInAdmin: boolean }>;
    expect(configs.find((item) => item.key === "wechat.app_secret")).toMatchObject({
      value: "",
      sensitive: true,
      editableInAdmin: false,
    });
    expect(JSON.stringify(response.body.data)).not.toContain("phase_01_mock_secret");
  });

  it("allows super admin to save editable configs with confirmation and writes a masked operation log", async () => {
    const superToken = await adminLogin("admin");

    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${superToken}`)
      .send({
        configs: [{ key: "wifi.reward_token_ttl_seconds", value: 600 }],
        reason: "Phase 11 config center smoke test",
        confirm: true,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.data).toMatchObject({ saved: true, sensitiveMasked: true });
        expect(response.body.data.updated[0]).toMatchObject({
          key: "wifi.reward_token_ttl_seconds",
          before: 300,
          after: 600,
          source: "admin_override",
        });
      });

    const config = await request(httpServer)
      .get("/api/admin/system/config")
      .set("Authorization", `Bearer ${superToken}`)
      .expect(200);
    const ttl = config.body.data.configs.find((item: { key: string }) => item.key === "wifi.reward_token_ttl_seconds");
    expect(ttl.value).toBe(600);

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", `Bearer ${superToken}`)
      .expect(200);
    expect(logs.body.data.list).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "system.config.save", targetType: "system_config" })]),
    );
    expect(JSON.stringify(logs.body.data.list)).not.toContain("WECHAT_PAY_" + "API_V3_KEY=");
  });

  it("rejects unconfirmed, invalid, readonly, and env-only config changes", async () => {
    const readonlyToken = await adminLogin("readonly_audit");
    const superToken = await adminLogin("admin");

    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ configs: [{ key: "wifi.mode", value: "manual" }], reason: "readonly", confirm: true })
      .expect(403);

    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ configs: [{ key: "wifi.mode", value: "bluetooth" }], reason: "bad enum", confirm: true })
      .expect(400);

    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ configs: [{ key: "wifi.mode", value: "manual" }] })
      .expect(400);

    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ configs: [{ key: "wechat.app_secret", value: "mock-secret-not-used" }], reason: "env only", confirm: true })
      .expect(400);
  });

  it("reports third-party status without blocking development on real production values", async () => {
    const readonlyToken = await adminLogin("readonly_audit");

    const response = await request(httpServer)
      .get("/api/admin/integrations/status")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      authMode: "mock_wechat",
      adMode: "mock",
      wifiMode: "mock",
      paymentMode: "mock",
      transferMode: "mock",
      storageMode: "local",
      notifyMode: "mock",
      readyForDevelopment: true,
      readyForProduction: false,
      mockAdapterActive: true,
      sensitiveMasked: true,
    });
    expect(response.body.data.missingProductionItems).toEqual(
      expect.arrayContaining(["AUTH_MODE", "AD_MODE", "WIFI_MODE", "PAYMENT_MODE", "TRANSFER_MODE", "STORAGE_MODE", "NOTIFY_MODE"]),
    );
    expect(response.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "wechatAppId", displayValue: "未配置" }),
        expect.objectContaining({ key: "apiV3Key", displayValue: "未配置" }),
        expect.objectContaining({ key: "wifiMode", status: "mock_adapter" }),
      ]),
    );
  });
});
