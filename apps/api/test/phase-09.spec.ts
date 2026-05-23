import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/main";

describe("Phase 09 PC admin page support APIs", () => {
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

  it("serves mock reconciliation pages and writes audit logs for finance actions", async () => {
    const readonlyToken = await adminLogin("readonly_audit");
    const financeToken = await adminLogin("finance");

    const list = await request(httpServer)
      .get("/api/admin/reconciliation")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .expect(200);
    expect(list.body.data).toMatchObject({
      total: 0,
      mockDifferenceSupported: true,
      emptyText: "暂无对账记录",
    });

    await request(httpServer)
      .post("/api/admin/reconciliation/run")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ type: "withdraw" })
      .expect(403);

    const run = await request(httpServer)
      .post("/api/admin/reconciliation/run")
      .set("Authorization", `Bearer ${financeToken}`)
      .send({ type: "withdraw", bizDate: "2026-05-23", remark: "Phase 09 mock reconciliation" })
      .expect(201);
    expect(run.body.data).toMatchObject({
      type: "withdraw",
      status: "mock_completed",
      diffAmountCent: 0,
    });

    const logs = await request(httpServer)
      .get("/api/admin/operation-logs")
      .set("Authorization", `Bearer ${financeToken}`)
      .expect(200);
    expect(logs.body.data.list).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "reconciliation.run", targetType: "reconciliation" })]),
    );
  });

  it("keeps readonly audit users away from write-only system and permission actions", async () => {
    const readonlyToken = await adminLogin("readonly_audit");
    const superToken = await adminLogin("admin");

    await request(httpServer)
      .get("/api/admin/system/config")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .expect(200);
    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ configs: [] })
      .expect(403);
    await request(httpServer)
      .post("/api/admin/admin-users")
      .set("Authorization", `Bearer ${readonlyToken}`)
      .send({ username: "phase09" })
      .expect(403);
    await request(httpServer)
      .post("/api/admin/system/config")
      .set("Authorization", `Bearer ${superToken}`)
      .send({ configs: [] })
      .expect(201);
  });
});
