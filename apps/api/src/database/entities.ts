export type MerchantStatus = "pending" | "active" | "disabled" | "risk_frozen";
export type RiskStatus = "normal" | "watch" | "frozen" | "blocked";
export type WifiSecurityType = "none" | "WEP" | "WPA" | "WPA2" | "WPA3";
export type WifiConnectMode = "mock" | "wechat" | "manual";
export type WalletLedgerType =
  | "revenue_confirm"
  | "withdraw_freeze"
  | "withdraw_paid"
  | "withdraw_failed_unfreeze"
  | "risk_freeze"
  | "risk_unfreeze"
  | "manual_adjust_add"
  | "manual_adjust_sub"
  | "reversal";

export interface UserEntity {
  id: number;
  openid: string;
  unionid?: string;
  userType: "customer" | "merchant_owner" | "admin_shadow";
  status: "active" | "disabled";
}

export interface MerchantEntity {
  id: number;
  merchantNo: string;
  name: string;
  ownerName?: string;
  ownerPhone?: string;
  city?: string;
  industry?: string;
  shareRateBps?: number;
  status: MerchantStatus;
  riskStatus: RiskStatus;
}

export interface MerchantOwnerEntity {
  merchantId: number;
  userId: number;
  openid: string;
  bindMethod: "admin" | "invite_code" | "merchant_qrcode";
  status: "pending" | "active" | "disabled";
}

export interface StoreEntity {
  id: number;
  merchantId: number;
  storeNo: string;
  name: string;
  city?: string;
  district?: string;
  address?: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
  shareRateBps?: number;
  status: MerchantStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreWifiEntity {
  id: number;
  storeId: number;
  ssid: string;
  passwordCipher?: string;
  passwordMasked: string;
  securityType: WifiSecurityType;
  connectMode: WifiConnectMode;
  isPrimary: boolean;
  isEnabled: boolean;
  allowCopyPassword: boolean;
  showManualFallback: boolean;
  passwordViewPolicy: "never_plain" | "copy_only" | "second_confirm_plain";
  remark?: string;
  createdAt?: string;
  updatedAt: string;
}

export interface QrcodeEntity {
  id: number;
  storeId: number;
  scene: string;
  qrcodeUrl: string | null;
  status: "active" | "disabled";
  createdAt: string;
}

export interface MerchantWalletEntity {
  merchantId: number;
  totalConfirmedCent: number;
  availableCent: number;
  frozenWithdrawCent: number;
  frozenRiskCent: number;
  totalWithdrawnCent: number;
  version: number;
}

export interface WalletLedgerEntity {
  id: number;
  ledgerNo: string;
  merchantId: number;
  ledgerType: WalletLedgerType;
  amountCent: number;
  availableAfterCent: number;
  frozenWithdrawAfterCent: number;
  frozenRiskAfterCent: number;
  idempotencyKey: string;
}

export const PHASE_01_REQUIRED_TABLES = [
  "users",
  "admin_users",
  "roles",
  "permissions",
  "merchants",
  "merchant_owners",
  "stores",
  "store_wifi",
  "ads",
  "ad_view_logs",
  "wifi_reward_tokens",
  "revenue_records",
  "merchant_wallets",
  "wallet_ledger",
  "withdraw_records",
  "ranking_snapshots",
  "risk_events",
  "system_configs",
  "operation_logs",
] as const;

export const PHASE_02_REQUIRED_TABLES = [
  ...PHASE_01_REQUIRED_TABLES,
  "admin_user_roles",
  "role_permissions",
  "merchant_applications",
  "merchant_application_logs",
  "qrcodes",
  "ad_campaigns",
  "ad_campaign_stores",
  "scan_logs",
  "wifi_connect_logs",
  "payment_callback_logs",
  "reconciliation_logs",
] as const;
