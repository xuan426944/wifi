import { INestApplication } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MigrationService } from "../src/database/migration.service";
import { validatePhase02Schema } from "../src/database/schema";
import { createApp } from "../src/main";

describe("Phase 02 database and basic backend", () => {
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

  it("ships a V3.4 init migration that covers all Phase 02 core tables", () => {
    const sql = readFileSync(
      join(__dirname, "../src/database/migrations/202605230201_init_v3_4.sql"),
      "utf8",
    );
    const result = validatePhase02Schema(sql);
    expect(result.valid).toBe(true);
    expect(result.tableCount).toBeGreaterThanOrEqual(30);
    expect(result.tables).toContain("wallet_ledger");
    expect(result.tables).toContain("operation_logs");
    expect(result.tables).toContain("merchant_applications");
    expect(result.missingTables).toEqual([]);
  });

  it("exposes migration validation through the database service", () => {
    const migrations = app.get(MigrationService);
    const result = migrations.validateLatest();
    expect(result.fileName).toBe("202605230201_init_v3_4.sql");
    expect(result.valid).toBe(true);
  });

  it("creates merchants through the basic backend and initializes a wallet record", async () => {
    const created = await request(httpServer)
      .post("/api/admin/merchants")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Phase 02 商户",
        ownerName: "老板",
        ownerPhone: "13900000000",
        city: "杭州",
        industry: "零售",
        shareRateBps: 4800,
      })
      .expect(201);

    expect(created.body.data.id).toBeGreaterThan(1);
    expect(created.body.data.status).toBe("pending");

    const detail = await request(httpServer)
      .get(`/api/admin/merchants/${created.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(detail.body.data.walletSummary).toMatchObject({
      merchantId: created.body.data.id,
      availableCent: 0,
      frozenWithdrawCent: 0,
    });
  });

  it("creates stores and saves WiFi config with masked password only", async () => {
    const store = await request(httpServer)
      .post("/api/admin/stores")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        merchantId: 1,
        name: "Phase 02 门店",
        city: "杭州",
        address: "测试路 2 号",
        industry: "零售",
      })
      .expect(201);

    const wifi = await request(httpServer)
      .post("/api/admin/wifi/save")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        storeId: store.body.data.id,
        ssid: "Phase02-WiFi",
        password: "phase02-secret",
        securityType: "WPA2",
        connectMode: "mock",
        isPrimary: true,
        isEnabled: true,
        allowCopyPassword: true,
        showManualFallback: true,
        passwordViewPolicy: "never_plain",
      })
      .expect(201);

    expect(wifi.body.data.ssid).toBe("Phase02-WiFi");
    expect(wifi.body.data.passwordMasked).not.toBe("phase02-secret");
    expect(wifi.body.data.passwordCipher).toBeUndefined();

    const detail = await request(httpServer)
      .get(`/api/admin/stores/${store.body.data.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.data.wifiStatus).toBe("已配置");
  });

  it("uses repositories for WiFi landing data while preserving the simple customer path", async () => {
    const login = await request(httpServer)
      .post("/api/auth/wx-login")
      .send({ code: "phase02-customer", mockOpenid: "phase02_customer" })
      .expect(201);

    const landing = await request(httpServer)
      .get("/api/store/landing")
      .set("Authorization", `Bearer ${login.body.data.token}`)
      .query({ scene: "STORE_1" })
      .expect(200);

    expect(landing.body.data.status).toBe("wifi_ready");
    expect(landing.body.data.wifiConfigured).toBe(true);
    expect(landing.body.data.merchantEntryPlacement).toBe("bottom_right");
  });
});
