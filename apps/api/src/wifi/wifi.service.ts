import { Inject, Injectable } from "@nestjs/common";
import { loadAppConfig } from "../config/app-config";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { WIFI_CONFIG_REPOSITORY, WifiConfigRepository } from "../database/repositories";
import { WIFI_PROVIDER, WifiProvider } from "../providers/provider.interfaces";

const tokenCode = () => `RT${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

@Injectable()
export class WifiService {
  constructor(
    @Inject(WIFI_PROVIDER) private readonly wifiProvider: WifiProvider,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiConfigs: WifiConfigRepository,
    @Inject(InMemoryStore) private readonly store: InMemoryStore,
  ) {}

  createRewardToken(input: { openid: string; storeId: number; viewNo: string }) {
    const view = this.store.adViews.get(input.viewNo);
    if (!view?.isEffective) {
      throw new ApiException(ERROR_CODES.AD_NOT_COMPLETED, "广告未完整观看", 400);
    }
    const config = loadAppConfig();
    const expiresAt = new Date(Date.now() + config.rewardTokenTtlSeconds * 1000);
    const token = tokenCode();
    this.store.rewardTokens.set(token, {
      token,
      openid: input.openid,
      storeId: input.storeId,
      viewNo: input.viewNo,
      expiresAt,
      status: "active",
    });
    return { rewardToken: token, expiresAt: expiresAt.toISOString() };
  }

  async connectInfo(rewardToken: string) {
    const token = this.store.rewardTokens.get(rewardToken);
    if (!token) {
      throw new ApiException(ERROR_CODES.REWARD_TOKEN_EXPIRED, "WiFi 授权已过期", 400);
    }
    if (token.expiresAt.getTime() < Date.now()) {
      throw new ApiException(ERROR_CODES.REWARD_TOKEN_EXPIRED, "WiFi 授权已过期", 400);
    }
    if (token.status === "used") {
      throw new ApiException(ERROR_CODES.REWARD_TOKEN_USED, "WiFi 授权已使用", 400);
    }
    const configured = this.wifiConfigs.findPrimaryByStoreId(token.storeId);
    if (!configured) {
      throw new ApiException(ERROR_CODES.WIFI_NOT_CONFIGURED, "门店 WiFi 未配置", 400);
    }
    const connectInfo = await this.wifiProvider.getConnectInfo({
      storeId: token.storeId,
      rewardToken,
    });
    token.status = "used";
    return connectInfo;
  }

  reportResult(input: { openid: string; storeId: number; status: string; rewardToken?: string; failReason?: string }) {
    return {
      accepted: true,
      openid: input.openid,
      storeId: input.storeId,
      status: input.status,
      manualFallback: input.status !== "success",
    };
  }
}
