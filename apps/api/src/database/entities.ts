export type MerchantStatus = "pending" | "active" | "disabled" | "risk_frozen";
export type RiskStatus = "normal" | "watch" | "frozen" | "blocked";
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
  address?: string;
  shareRateBps?: number;
  status: MerchantStatus;
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
