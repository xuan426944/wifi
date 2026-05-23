import { Inject, Injectable } from "@nestjs/common";
import { ERROR_CODES, ApiException } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { STORE_REPOSITORY, StoreRepository, WIFI_CONFIG_REPOSITORY, WifiConfigRepository } from "../database/repositories";
import { AD_PROVIDER, AdProvider } from "../providers/provider.interfaces";
import { WifiService } from "../wifi/wifi.service";

@Injectable()
export class AdService {
  constructor(
    @Inject(AD_PROVIDER) private readonly adProvider: AdProvider,
    @Inject(InMemoryStore) private readonly store: InMemoryStore,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiConfigs: WifiConfigRepository,
    @Inject(WifiService) private readonly wifiService: WifiService,
  ) {}

  async start(openid: string, storeId: number) {
    const store = this.stores.findById(storeId);
    if (!store || store.status !== "active") {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在或不可用", 404);
    }
    if (!this.wifiConfigs.findPrimaryByStoreId(storeId)) {
      throw new ApiException(ERROR_CODES.WIFI_NOT_CONFIGURED, "门店 WiFi 未配置", 400);
    }
    const view = await this.adProvider.startView({ openid, storeId });
    this.store.adViews.set(view.viewNo, {
      viewNo: view.viewNo,
      openid,
      storeId,
      status: "started",
      isEffective: false,
      startedAt: new Date().toISOString(),
    });
    return {
      ...view,
      complianceNotice: "请在用户主动点击后展示广告，完整观看后才可连接 WiFi",
      rewardTokenIssued: false,
    };
  }

  async finish(openid: string, viewNo: string, isEnded: boolean) {
    const record = this.store.adViews.get(viewNo);
    if (!record) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "广告观看记录不存在", 404);
    }
    if (record.openid !== openid) {
      throw new ApiException(ERROR_CODES.UNAUTHORIZED, "广告观看记录不属于当前用户", 401);
    }
    if (record.status === "completed" && record.rewardToken) {
      const token = this.store.rewardTokens.get(record.rewardToken);
      return {
        isEffective: true,
        rewardToken: record.rewardToken,
        expiresAt: token?.expiresAt.toISOString(),
        reused: true,
      };
    }
    const result = await this.adProvider.verifyComplete({ viewNo, isEnded });
    record.isEffective = result.isEffective;
    record.status = result.isEffective ? "completed" : "closed_early";
    record.invalidReason = result.invalidReason;
    record.finishedAt = new Date().toISOString();
    if (!result.isEffective) {
      return {
        ...result,
        rewardToken: null,
        adComplianceText: "广告未完整观看，不能发放 WiFi 授权",
      };
    }
    const configured = this.wifiConfigs.findPrimaryByStoreId(record.storeId);
    if (!configured) {
      return {
        ...result,
        rewardToken: null,
        wifiConfigured: false,
        missingWifiText: "门店 WiFi 暂未配置，请联系店员",
      };
    }
    const reward = this.wifiService.issueRewardToken({
      openid: record.openid,
      storeId: record.storeId,
      viewNo: record.viewNo,
    });
    return {
      ...result,
      ...reward,
      wifiConfigured: true,
    };
  }
}
