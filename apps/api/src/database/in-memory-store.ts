import { Injectable } from "@nestjs/common";
import { MerchantEntity, MerchantOwnerEntity, StoreEntity, UserEntity } from "./entities";

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
  readonly users: UserEntity[] = [
    { id: 1, openid: "mock_customer", status: "active" },
    { id: 2, openid: "mock_merchant_active", status: "active" },
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
}
