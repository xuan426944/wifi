import { Injectable } from "@nestjs/common";
import {
  MerchantEntity,
  MerchantOwnerEntity,
  MerchantWalletEntity,
  QrcodeEntity,
  RankingConfigEntity,
  RankingSnapshotEntity,
  RevenueRecordEntity,
  RiskEventEntity,
  StoreEntity,
  StoreWifiEntity,
  UserEntity,
  WalletLedgerEntity,
  WithdrawRecordEntity,
} from "./entities";

export interface AdViewRecord {
  id: number;
  viewNo: string;
  openid: string;
  storeId: number;
  status: "started" | "completed" | "closed_early";
  isEffective: boolean;
  invalidReason?: string;
  rewardToken?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface RewardTokenRecord {
  token: string;
  openid: string;
  storeId: number;
  viewNo: string;
  expiresAt: Date;
  status: "active" | "used";
}

export interface ScanLogRecord {
  id: number;
  openid: string;
  storeId: number;
  scene?: string;
  createdAt: string;
}

export interface WifiConnectLogRecord {
  id: number;
  openid: string;
  storeId: number;
  rewardToken?: string;
  status: "success" | "failed" | "manual" | "missing_wifi";
  failReason?: string;
  createdAt: string;
}

@Injectable()
export class InMemoryStore {
  private userSeq = 5;
  private merchantSeq = 4;
  private storeSeq = 1;
  private wifiSeq = 1;
  private qrcodeSeq = 1;
  private scanLogSeq = 0;
  private wifiConnectLogSeq = 0;
  private adViewLogSeq = 0;
  private revenueSeq = 0;
  private ledgerSeq = 0;
  private withdrawSeq = 0;
  private rankingSnapshotSeq = 0;
  private riskEventSeq = 0;

  readonly users: UserEntity[] = [
    { id: 1, openid: "mock_customer", userType: "customer", status: "active" },
    { id: 2, openid: "mock_merchant_active", userType: "merchant_owner", status: "active" },
    { id: 3, openid: "mock_merchant_pending", userType: "merchant_owner", status: "active" },
    { id: 4, openid: "mock_merchant_disabled", userType: "merchant_owner", status: "active" },
    { id: 5, openid: "mock_merchant_risk_frozen", userType: "merchant_owner", status: "active" },
  ];

  readonly merchants: MerchantEntity[] = [
    {
      id: 1,
      merchantNo: "M202605230001",
      name: "Mock 商户",
      ownerName: "Mock 老板",
      ownerPhone: "13800000000",
      city: "上海",
      industry: "餐饮",
      shareRateBps: 5000,
      status: "active",
      riskStatus: "normal",
    },
    {
      id: 2,
      merchantNo: "M202605230002",
      name: "Mock 待审商户",
      ownerName: "待审老板",
      ownerPhone: "13800000001",
      city: "上海",
      industry: "餐饮",
      shareRateBps: 5000,
      status: "pending",
      riskStatus: "normal",
    },
    {
      id: 3,
      merchantNo: "M202605230003",
      name: "Mock 禁用商户",
      ownerName: "禁用老板",
      ownerPhone: "13800000002",
      city: "上海",
      industry: "餐饮",
      shareRateBps: 5000,
      status: "disabled",
      riskStatus: "blocked",
    },
    {
      id: 4,
      merchantNo: "M202605230004",
      name: "Mock 风控冻结商户",
      ownerName: "风控老板",
      ownerPhone: "13800000003",
      city: "上海",
      industry: "餐饮",
      shareRateBps: 5000,
      status: "risk_frozen",
      riskStatus: "frozen",
    },
  ];

  readonly merchantOwners: MerchantOwnerEntity[] = [
    {
      merchantId: 1,
      userId: 2,
      openid: "mock_merchant_active",
      bindMethod: "admin",
      status: "active",
    },
    {
      merchantId: 2,
      userId: 3,
      openid: "mock_merchant_pending",
      bindMethod: "admin",
      status: "active",
    },
    {
      merchantId: 3,
      userId: 4,
      openid: "mock_merchant_disabled",
      bindMethod: "admin",
      status: "active",
    },
    {
      merchantId: 4,
      userId: 5,
      openid: "mock_merchant_risk_frozen",
      bindMethod: "admin",
      status: "active",
    },
  ];

  readonly stores: StoreEntity[] = [
    {
      id: 1,
      merchantId: 1,
      storeNo: "S202605230001",
      name: "Mock 门店",
      city: "上海",
      address: "Mock 路 1 号",
      status: "active",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ];

  readonly storeWifi: StoreWifiEntity[] = [
    {
      id: 1,
      storeId: 1,
      ssid: "Mock-WiFi",
      passwordCipher: "mock-cipher:MTIzNDU2Nzg",
      passwordMasked: "********",
      securityType: "WPA2",
      connectMode: "mock",
      isPrimary: true,
      isEnabled: true,
      allowCopyPassword: true,
      showManualFallback: true,
      passwordViewPolicy: "never_plain",
      remark: "Phase 02 mock WiFi",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
  ];

  readonly qrcodes: QrcodeEntity[] = [
    {
      id: 1,
      storeId: 1,
      scene: "STORE_1",
      qrcodeUrl: "/mock/qrcode/STORE_1.png",
      status: "active",
      createdAt: new Date(0).toISOString(),
    },
  ];

  readonly wallets: MerchantWalletEntity[] = [
    {
      merchantId: 1,
      totalConfirmedCent: 0,
      availableCent: 0,
      frozenWithdrawCent: 0,
      frozenRiskCent: 0,
      totalWithdrawnCent: 0,
      version: 0,
      updatedAt: new Date(0).toISOString(),
    },
    {
      merchantId: 2,
      totalConfirmedCent: 0,
      availableCent: 0,
      frozenWithdrawCent: 0,
      frozenRiskCent: 0,
      totalWithdrawnCent: 0,
      version: 0,
      updatedAt: new Date(0).toISOString(),
    },
    {
      merchantId: 3,
      totalConfirmedCent: 0,
      availableCent: 0,
      frozenWithdrawCent: 0,
      frozenRiskCent: 0,
      totalWithdrawnCent: 0,
      version: 0,
      updatedAt: new Date(0).toISOString(),
    },
    {
      merchantId: 4,
      totalConfirmedCent: 0,
      availableCent: 0,
      frozenWithdrawCent: 0,
      frozenRiskCent: 0,
      totalWithdrawnCent: 0,
      version: 0,
      updatedAt: new Date(0).toISOString(),
    },
  ];

  readonly adViews = new Map<string, AdViewRecord>();
  readonly rewardTokens = new Map<string, RewardTokenRecord>();
  readonly scanLogs: ScanLogRecord[] = [];
  readonly wifiConnectLogs: WifiConnectLogRecord[] = [];
  readonly revenueRecords: RevenueRecordEntity[] = [];
  readonly walletLedger: WalletLedgerEntity[] = [];
  readonly withdrawRecords: WithdrawRecordEntity[] = [];
  readonly rankingSnapshots: RankingSnapshotEntity[] = [];
  readonly riskEvents: RiskEventEntity[] = [];
  rankingConfig: RankingConfigEntity = {
    enabled: true,
    enabledTypes: [
      "today_revenue",
      "yesterday_revenue",
      "month_revenue",
      "total_revenue",
      "scan_count",
      "ad_complete_count",
      "connect_success_count",
      "city_revenue",
      "industry_revenue",
    ],
    limit: 20,
    amountDisplayMode: "range",
    refreshMinutes: 10,
    hideRiskStores: true,
    hideNewStores: false,
    newStoreDays: 7,
    minRevenueCent: 0,
    minScanCount: 0,
    visibleScope: "global",
    updatedAt: new Date(0).toISOString(),
  };

  findMerchantOwner(openid: string) {
    const owner = this.merchantOwners.find((item) => item.openid === openid && item.status === "active");
    if (!owner) {
      return undefined;
    }
    const merchant = this.merchants.find((item) => item.id === owner.merchantId);
    return merchant ? { owner, merchant } : undefined;
  }

  nextUserId() {
    this.userSeq += 1;
    return this.userSeq;
  }

  nextMerchantId() {
    this.merchantSeq += 1;
    return this.merchantSeq;
  }

  nextStoreId() {
    this.storeSeq += 1;
    return this.storeSeq;
  }

  nextWifiId() {
    this.wifiSeq += 1;
    return this.wifiSeq;
  }

  nextQrcodeId() {
    this.qrcodeSeq += 1;
    return this.qrcodeSeq;
  }

  nextScanLogId() {
    this.scanLogSeq += 1;
    return this.scanLogSeq;
  }

  nextWifiConnectLogId() {
    this.wifiConnectLogSeq += 1;
    return this.wifiConnectLogSeq;
  }

  nextAdViewLogId() {
    this.adViewLogSeq += 1;
    return this.adViewLogSeq;
  }

  nextRevenueId() {
    this.revenueSeq += 1;
    return this.revenueSeq;
  }

  nextLedgerId() {
    this.ledgerSeq += 1;
    return this.ledgerSeq;
  }

  nextWithdrawId() {
    this.withdrawSeq += 1;
    return this.withdrawSeq;
  }

  nextRankingSnapshotId() {
    this.rankingSnapshotSeq += 1;
    return this.rankingSnapshotSeq;
  }

  nextRiskEventId() {
    this.riskEventSeq += 1;
    return this.riskEventSeq;
  }
}
