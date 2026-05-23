import { Body, Controller, Get, Inject, Post, Query, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { STORE_REPOSITORY, StoreRepository, WIFI_CONFIG_REPOSITORY, WifiConfigRepository } from "../database/repositories";

@Controller()
export class StoreController {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiConfigs: WifiConfigRepository,
  ) {}

  @Get("store/landing")
  landing(@Query("scene") scene: string) {
    const store = this.stores.list()[0];
    const wifi = store ? this.wifiConfigs.findPrimaryByStoreId(store.id) : undefined;
    return ok({
      scene,
      storeId: store?.id ?? null,
      storeName: store?.name ?? "未知门店",
      wifiName: wifi?.ssid ?? null,
      status: wifi ? "wifi_ready" : "wifi_missing",
      adRequired: true,
      wifiConfigured: Boolean(wifi),
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
