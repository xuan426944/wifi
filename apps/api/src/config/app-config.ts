export type AuthMode = "mock_wechat" | "wechat";
export type AdMode = "mock" | "wechat" | "self" | "cpa" | "cps";
export type WifiMode = "mock" | "wechat" | "manual";
export type PaymentMode = "mock" | "wechat";
export type TransferMode = "mock" | "wechat";
export type StorageMode = "local" | "oss";
export type NotifyMode = "mock" | "wechat";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  authMode: AuthMode;
  adMode: AdMode;
  wifiMode: WifiMode;
  paymentMode: PaymentMode;
  transferMode: TransferMode;
  storageMode: StorageMode;
  notifyMode: NotifyMode;
  jwtSecret: string;
  rewardTokenTtlSeconds: number;
  defaultMerchantShareRateBps: number;
  withdrawMinAmountCent: number;
}

const oneOf = <T extends string>(name: string, value: string | undefined, allowed: readonly T[], fallback: T): T => {
  const current = (value ?? fallback) as T;
  if (!allowed.includes(current)) {
    throw new Error(`${name} must be one of ${allowed.join(", ")}`);
  }
  return current;
};

export const loadAppConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  nodeEnv: env.NODE_ENV ?? "development",
  port: Number(env.APP_PORT ?? 3000),
  authMode: oneOf("AUTH_MODE", env.AUTH_MODE, ["mock_wechat", "wechat"] as const, "mock_wechat"),
  adMode: oneOf("AD_MODE", env.AD_MODE, ["mock", "wechat", "self", "cpa", "cps"] as const, "mock"),
  wifiMode: oneOf("WIFI_MODE", env.WIFI_MODE, ["mock", "wechat", "manual"] as const, "mock"),
  paymentMode: oneOf("PAYMENT_MODE", env.PAYMENT_MODE, ["mock", "wechat"] as const, "mock"),
  transferMode: oneOf("TRANSFER_MODE", env.TRANSFER_MODE, ["mock", "wechat"] as const, "mock"),
  storageMode: oneOf("STORAGE_MODE", env.STORAGE_MODE, ["local", "oss"] as const, "local"),
  notifyMode: oneOf("NOTIFY_MODE", env.NOTIFY_MODE, ["mock", "wechat"] as const, "mock"),
  jwtSecret: env.JWT_SECRET ?? "phase_01_mock_secret",
  rewardTokenTtlSeconds: Number(env.WIFI_REWARD_TOKEN_TTL_SECONDS ?? 300),
  defaultMerchantShareRateBps: Number(env.DEFAULT_MERCHANT_SHARE_RATE_BPS ?? 5000),
  withdrawMinAmountCent: Number(env.WITHDRAW_MIN_AMOUNT_CENT ?? 5000),
});

export const APP_CONFIG = Symbol("APP_CONFIG");
