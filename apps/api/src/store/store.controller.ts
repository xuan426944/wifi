import { Body, Controller, Get, Inject, Post, Query, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import {
  QRCODE_REPOSITORY,
  QrcodeRepository,
  STORE_REPOSITORY,
  StoreRepository,
  WIFI_CONFIG_REPOSITORY,
  WifiConfigRepository,
} from "../database/repositories";

@Controller()
export class StoreController {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiConfigs: WifiConfigRepository,
    @Inject(QRCODE_REPOSITORY) private readonly qrcodes: QrcodeRepository,
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
  ) {}

  @Get("store/landing")
  landing(@Query("scene") scene: string) {
    const store = this.resolveStore(scene);
    if (store.status !== "active") {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店已禁用或不可用", 404);
    }
    const wifi = store ? this.wifiConfigs.findPrimaryByStoreId(store.id) : undefined;
    return ok({
      scene,
      storeId: store?.id ?? null,
      storeName: store?.name ?? "未知门店",
      wifiName: wifi?.ssid ?? null,
      status: wifi ? "wifi_ready" : "wifi_missing",
      adRequired: Boolean(wifi),
      wifiConfigured: Boolean(wifi),
      missingWifiText: wifi ? null : "门店 WiFi 暂未配置，请联系店员",
      connectButtonEnabled: Boolean(wifi),
      merchantEntryPlacement: "bottom_right",
    });
  }

  @Post("scan/report")
  report(@Req() request: any, @Body() body: { storeId: number; scene?: string }) {
    const store = this.stores.findById(Number(body.storeId));
    if (!store || store.status !== "active") {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在或不可用", 404);
    }
    if (body.scene) {
      const sceneStore = this.resolveStore(body.scene);
      if (sceneStore.id !== store.id) {
        throw new ApiException(ERROR_CODES.PARAM_INVALID, "scene 与门店不匹配", 400);
      }
    }
    const scanLog = {
      id: this.memoryStore.nextScanLogId(),
      openid: request.principal.openid,
      storeId: store.id,
      scene: body.scene,
      createdAt: new Date().toISOString(),
    };
    this.memoryStore.scanLogs.push(scanLog);
    return ok({
      accepted: true,
      scanLogId: scanLog.id,
      openid: request.principal.openid,
      storeId: body.storeId,
      scene: body.scene,
    });
  }

  private resolveStore(scene: string) {
    const qrcode = scene ? this.qrcodes.findByScene(scene) : undefined;
    const sceneStoreId = qrcode?.storeId ?? this.parseStoreId(scene);
    const store = sceneStoreId ? this.stores.findById(sceneStoreId) : this.stores.list()[0];
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    return store;
  }

  private parseStoreId(scene?: string) {
    if (!scene) {
      return undefined;
    }
    const matched = scene.match(/^(?:STORE_|store_)?(\d+)$/);
    return matched ? Number(matched[1]) : undefined;
  }
}
