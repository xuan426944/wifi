export interface AuthProvider {
  code2Session(code: string, mockOpenid?: string): Promise<{ openid: string; unionid?: string }>;
}

export interface AdProvider {
  startView(input: { openid: string; storeId: number }): Promise<{
    viewNo: string;
    adMode: string;
    adUnitId: string;
    mockAdPayload: Record<string, unknown>;
  }>;
  verifyComplete(input: { viewNo: string; isEnded: boolean }): Promise<{ isEffective: boolean; invalidReason?: string }>;
}

export interface WifiProvider {
  getConnectInfo(input: {
    storeId: number;
    rewardToken: string;
    configuredWifi?: {
      ssid: string;
      password: string;
      securityType: "none" | "WEP" | "WPA" | "WPA2" | "WPA3";
      connectMode: "mock" | "wechat" | "manual";
      allowCopyPassword: boolean;
      showManualFallback: boolean;
    };
  }): Promise<{
    ssid: string;
    password: string;
    securityType: "none" | "WEP" | "WPA" | "WPA2" | "WPA3";
    connectMode: "mock" | "wechat" | "manual";
    manualFallback: {
      allowCopyPassword: boolean;
      steps: string[];
    };
  }>;
}

export interface TransferProvider {
  transfer(input: { withdrawNo: string; openid: string; amountCent: number }): Promise<{
    outBillNo: string;
    status: "processing" | "paid" | "failed";
  }>;
  query(outBillNo: string): Promise<{ status: "processing" | "paid" | "failed"; remoteBillNo?: string }>;
}

export interface NotifyVerifier {
  verify(input: { headers: Record<string, string | string[] | undefined>; rawBody: string }): Promise<boolean>;
}

export const AUTH_PROVIDER = Symbol("AUTH_PROVIDER");
export const AD_PROVIDER = Symbol("AD_PROVIDER");
export const WIFI_PROVIDER = Symbol("WIFI_PROVIDER");
export const TRANSFER_PROVIDER = Symbol("TRANSFER_PROVIDER");
export const NOTIFY_VERIFIER = Symbol("NOTIFY_VERIFIER");
