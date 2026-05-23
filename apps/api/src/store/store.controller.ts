import { Body, Controller, Get, Inject, Post, Query, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { InMemoryStore } from "../database/in-memory-store";

@Controller()
export class StoreController {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  @Get("store/landing")
  landing(@Query("scene") scene: string) {
    const store = this.store.stores[0];
    return ok({
      scene,
      storeId: store.id,
      storeName: store.name,
      wifiName: "Mock-WiFi",
      status: "wifi_ready",
      adRequired: true,
      wifiConfigured: true,
      merchantEntryPlacement: "bottom_right",
    });
  }

  @Post("scan/report")
  report(@Req() request: any, @Body() body: { storeId: number; scene?: string }) {
    return ok({
      accepted: true,
      openid: request.principal.openid,
      storeId: body.storeId,
      scene: body.scene,
    });
  }
}
