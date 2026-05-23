import { Injectable } from "@nestjs/common";
import {
  MerchantEntity,
  MerchantOwnerEntity,
  MerchantWalletEntity,
  StoreEntity,
  StoreWifiEntity,
  UserEntity,
} from "./entities";

export interface AdViewRecord {
  viewNo: string;
  openid: string;
  storeId: number;
  isEffective: boolean;
}

export interface RewardTokenRecord {
  token: string;
  openid: string;
  storeId: number;
  viewNo: string;
  expiresAt: Date;
  status: "active" | "used";
}

@Injectable()
export class InMemoryStore {
  private userSeq = 2;
  private merchantSeq = 1;
  private storeSeq = 1;
  private wifiSeq = 1;

  readonly users: UserEntity[] = [
    { id: 1, openid: "mock_customer", userType: "customer", status: "active" },
    { id: 2, openid: "mock_merchant_active", userType: "merchant_owner", status: "active" },
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
  ];

  readonly merchantOwners: MerchantOwnerEntity[] = [
    {
      merchantId: 1,
      userId: 2,
      openid: "mock_merchant_active",
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
    },
  ];

  readonly storeWifi: StoreWifiEntity[] = [
    {
      id: 1,
      storeId: 1,
      ssid: "Mock-WiFi",
      passwordCipher: "mock-cipher:12345678",
      passwordMasked: "********",
      securityType: "WPA2",
      connectMode: "mock",
      isPrimary: true,
      isEnabled: true,
      allowCopyPassword: true,
      showManualFallback: true,
      passwordViewPolicy: "never_plain",
      remark: "Phase 02 mock WiFi",
      updatedAt: new Date(0).toISOString(),
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
    },
  ];

  readonly adViews = new Map<string, AdViewRecord>();
  readonly rewardTokens = new Map<string, RewardTokenRecord>();

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
}
