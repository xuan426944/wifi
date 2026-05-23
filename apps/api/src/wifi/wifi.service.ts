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
    if (view.openid !== input.openid || view.storeId !== input.storeId) {
      throw new ApiException(ERROR_CODES.UNAUTHORIZED, "reward_token 与当前用户或门店不匹配", 401);
    }
    const configured = this.wifiConfigs.findPrimaryByStoreId(input.storeId);
    if (!configured) {
      throw new ApiException(ERROR_CODES.WIFI_NOT_CONFIGURED, "门店 WiFi 未配置", 400);
    }
    if (view.rewardToken) {
      const existing = this.store.rewardTokens.get(view.rewardToken);
      if (existing?.status === "active" && existing.expiresAt.getTime() >= Date.now()) {
        return { rewardToken: existing.token, expiresAt: existing.expiresAt.toISOString(), reused: true };
      }
    }
    return this.issueRewardToken(input);
  }

  issueRewardToken(input: { openid: string; storeId: number; viewNo: string }) {
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
    const view = this.store.adViews.get(input.viewNo);
    if (view) {
      view.rewardToken = token;
    }
    return { rewardToken: token, expiresAt: expiresAt.toISOString(), reused: false };
  }

  async connectInfo(openid: string, rewardToken: string) {
    const token = this.store.rewardTokens.get(rewardToken);
    if (!token) {
      throw new ApiException(ERROR_CODES.REWARD_TOKEN_EXPIRED, "WiFi 授权已过期", 400);
    }
    if (token.openid !== openid) {
      throw new ApiException(ERROR_CODES.UNAUTHORIZED, "reward_token 与当前用户不匹配", 401);
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
    const password = this.wifiConfigs.copyPassword(configured.id) ?? "";
    const connectInfo = await this.wifiProvider.getConnectInfo({
      storeId: token.storeId,
      rewardToken,
      configuredWifi: {
        ssid: configured.ssid,
        password,
        securityType: configured.securityType,
        connectMode: configured.connectMode,
        allowCopyPassword: configured.allowCopyPassword,
        showManualFallback: configured.showManualFallback,
      },
    });
    token.status = "used";
    return connectInfo;
  }

  reportResult(input: { openid: string; storeId: number; status: string; rewardToken?: string; failReason?: string }) {
    if (!["success", "failed", "manual", "missing_wifi"].includes(input.status)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "WiFi 连接结果状态不合法", 400);
    }
    const token = input.rewardToken ? this.store.rewardTokens.get(input.rewardToken) : undefined;
    if (token && (token.openid !== input.openid || token.storeId !== input.storeId)) {
      throw new ApiException(ERROR_CODES.UNAUTHORIZED, "reward_token 与当前用户或门店不匹配", 401);
    }
    const log = {
      id: this.store.nextWifiConnectLogId(),
      openid: input.openid,
      storeId: input.storeId,
      rewardToken: input.rewardToken,
      status: input.status as "success" | "failed" | "manual" | "missing_wifi",
      failReason: input.failReason,
      createdAt: new Date().toISOString(),
    };
    this.store.wifiConnectLogs.push(log);
    return {
      accepted: true,
      connectLogId: log.id,
      openid: input.openid,
      storeId: input.storeId,
      status: input.status,
      manualFallback: input.status !== "success",
      manualFallbackSteps:
        input.status === "success"
          ? []
          : ["复制 WiFi 名称", "复制 WiFi 密码", "打开系统设置并手动连接", "返回首页"],
    };
  }
}
