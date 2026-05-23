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
export type RevenueStatus = "estimated" | "pending_settlement" | "confirmed" | "withdrawable" | "frozen" | "invalid";
export type ShareRuleSource = "store" | "merchant" | "campaign" | "global";
export type WithdrawStatus =
  | "created"
  | "frozen"
  | "reviewing"
  | "transfer_processing"
  | "paid"
  | "failed"
  | "rejected"
  | "canceled"
  | "abnormal";
export type RankingType =
  | "today_revenue"
  | "yesterday_revenue"
  | "month_revenue"
  | "total_revenue"
  | "scan_count"
  | "ad_complete_count"
  | "connect_success_count"
  | "city_revenue"
  | "industry_revenue";
export type RankingAmountDisplayMode = "exact" | "range" | "heat" | "hidden";
export type RankingVisibleScope = "global" | "city" | "industry";
export type RiskEventType = "connect_fail_rate_high";
export type RiskEventLevel = "low" | "medium" | "high" | "critical";
export type RiskEventStatus = "open" | "handled" | "ignored";
export type RiskHandleAction =
  | "ignore"
  | "freeze_revenue"
  | "pause_withdraw"
  | "disable_store"
  | "disable_merchant"
  | "recover"
  | "remark";
export type MerchantApplicationStatus = "draft" | "submitted" | "reviewing" | "approved" | "rejected" | "canceled";
export type ReconciliationType = "withdraw" | "wallet_ledger" | "revenue_settlement";
export type ReconciliationScenario =
  | "matched"
  | "local_paid_remote_failed"
  | "local_processing_remote_paid"
  | "local_failed_remote_paid"
  | "amount_mismatch"
  | "missing_remote"
  | "duplicate_callback";
export type ReconciliationSeverity = "info" | "warning" | "high" | "critical";

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

export interface MerchantApplicationEntity {
  id: number;
  applicationNo: string;
  userId: number;
  openid: string;
  sourceStoreId?: number;
  merchantName: string;
  applicantName: string;
  applicantPhone: string;
  storeName: string;
  city: string;
  district?: string;
  address: string;
  industry: string;
  wifiSsid?: string;
  wifiPasswordCipher?: string;
  wifiPasswordMasked?: string;
  remark?: string;
  status: MerchantApplicationStatus;
  rejectReason?: string;
  allowResubmit: boolean;
  createdMerchantId?: number;
  createdStoreId?: number;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantApplicationLogEntity {
  id: number;
  applicationId: number;
  applicationNo: string;
  action: string;
  actorType: "user" | "admin" | "system";
  actorId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
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
  updatedAt?: string;
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
  refType?: string;
  refId?: number;
  refLedgerId?: number;
  idempotencyKey: string;
  remark?: string;
  createdAt?: string;
}

export interface RevenueRecordEntity {
  id: number;
  revenueNo: string;
  merchantId: number;
  storeId: number;
  adViewLogId?: number;
  viewNo?: string;
  settlementBatchId?: number;
  grossAmountCent: number;
  merchantAmountCent: number;
  platformAmountCent: number;
  appliedShareRateBps: number;
  shareRuleSource: ShareRuleSource;
  shareRuleRefId?: number;
  status: RevenueStatus;
  invalidReason?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface WithdrawRecordEntity {
  id: number;
  withdrawNo: string;
  merchantId: number;
  openid: string;
  amountCent: number;
  status: WithdrawStatus;
  outBillNo?: string;
  wechatBillNo?: string;
  failReason?: string;
  reviewReason?: string;
  appliedAt: string;
  frozenAt?: string;
  paidAt?: string;
  updatedAt: string;
}

export interface RankingConfigEntity {
  enabled: boolean;
  enabledTypes: RankingType[];
  limit: number;
  amountDisplayMode: RankingAmountDisplayMode;
  refreshMinutes: number;
  hideRiskStores: boolean;
  hideNewStores: boolean;
  newStoreDays: number;
  minRevenueCent: number;
  minScanCount: number;
  visibleScope: RankingVisibleScope;
  updatedAt: string;
}

export interface RankingSnapshotEntity {
  id: number;
  snapshotNo: string;
  type: RankingType;
  generatedAt: string;
  itemCount: number;
  amountDisplayMode: RankingAmountDisplayMode;
}

export interface RiskEventEntity {
  id: number;
  eventNo: string;
  riskType: RiskEventType;
  level: RiskEventLevel;
  status: RiskEventStatus;
  merchantId?: number;
  storeId?: number;
  openid?: string;
  description: string;
  evidence: Record<string, unknown>;
  handledBy?: string;
  handledAction?: RiskHandleAction;
  handleRemark?: string;
  createdAt: string;
  updatedAt: string;
  handledAt?: string;
}

export interface ReconciliationLogEntity {
  id: number;
  reconcileNo: string;
  type: ReconciliationType;
  bizDate: string;
  scenario: ReconciliationScenario;
  localStatus: string;
  remoteStatus: string;
  amountCent: number;
  localAmountCent: number;
  remoteAmountCent: number;
  diffAmountCent: number;
  result: "matched" | "different" | "abnormal";
  status: "mock_completed" | "pending_manual_review" | "fixed";
  severity: ReconciliationSeverity;
  requiresManualReview: boolean;
  detail: string;
  handledBy?: string;
  handledAt?: string;
  createdAt: string;
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
