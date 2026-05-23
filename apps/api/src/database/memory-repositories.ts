import { Inject, Injectable } from "@nestjs/common";
import { CreateMerchantDto, CreateStoreDto, SaveWifiConfigDto, UpdateShareRateDto } from "./dtos";
import { MerchantEntity, StoreEntity, StoreWifiEntity, UserEntity } from "./entities";
import { InMemoryStore } from "./in-memory-store";
import {
  MerchantRepository,
  StoreRepository,
  UserRepository,
  WalletRepository,
  WifiConfigRepository,
} from "./repositories";

const pad = (value: number) => String(value).padStart(6, "0");
const maskPassword = (password?: string) => (password ? "*".repeat(Math.min(Math.max(password.length, 8), 12)) : "********");
const cipherPassword = (password?: string) => (password ? `mock-cipher:${Buffer.from(password).toString("base64url")}` : undefined);

@Injectable()
export class MemoryUserRepository implements UserRepository {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  findOrCreateByOpenid(openid: string, unionid?: string): UserEntity {
    const existing = this.store.users.find((user) => user.openid === openid);
    if (existing) {
      return existing;
    }
    const user: UserEntity = {
      id: this.store.nextUserId(),
      openid,
      unionid,
      userType: "customer",
      status: "active",
    };
    this.store.users.push(user);
    return user;
  }
}

@Injectable()
export class MemoryMerchantRepository implements MerchantRepository {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  list() {
    return [...this.store.merchants];
  }

  findById(id: number) {
    return this.store.merchants.find((merchant) => merchant.id === id);
  }

  create(input: CreateMerchantDto): MerchantEntity {
    const id = this.store.nextMerchantId();
    const merchant: MerchantEntity = {
      id,
      merchantNo: `M20260523${pad(id)}`,
      name: input.name,
      ownerName: input.ownerName,
      ownerPhone: input.ownerPhone,
      city: input.city,
      industry: input.industry,
      shareRateBps: input.shareRateBps ?? undefined,
      status: "pending",
      riskStatus: "normal",
    };
    this.store.merchants.push(merchant);
    this.store.wallets.push({
      merchantId: id,
      totalConfirmedCent: 0,
      availableCent: 0,
      frozenWithdrawCent: 0,
      frozenRiskCent: 0,
      totalWithdrawnCent: 0,
      version: 0,
    });
    return merchant;
  }

  updateShareRate(id: number, input: UpdateShareRateDto) {
    const merchant = this.findById(id);
    if (!merchant) {
      throw new Error("merchant not found");
    }
    merchant.shareRateBps = input.shareRateBps;
    return merchant;
  }

  findActiveOwner(openid: string) {
    return this.store.findMerchantOwner(openid);
  }
}

@Injectable()
export class MemoryStoreRepository implements StoreRepository {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  list() {
    return [...this.store.stores];
  }

  findById(id: number) {
    return this.store.stores.find((store) => store.id === id);
  }

  findByMerchantId(merchantId: number) {
    return this.store.stores.filter((store) => store.merchantId === merchantId);
  }

  create(input: CreateStoreDto): StoreEntity {
    const id = this.store.nextStoreId();
    const store: StoreEntity = {
      id,
      merchantId: input.merchantId,
      storeNo: `S20260523${pad(id)}`,
      name: input.name,
      city: input.city,
      district: input.district,
      address: input.address,
      industry: input.industry,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      shareRateBps: input.shareRateBps ?? undefined,
      status: "active",
    };
    this.store.stores.push(store);
    return store;
  }

  updateShareRate(id: number, input: UpdateShareRateDto) {
    const store = this.findById(id);
    if (!store) {
      throw new Error("store not found");
    }
    store.shareRateBps = input.shareRateBps;
    return store;
  }
}

@Injectable()
export class MemoryWifiConfigRepository implements WifiConfigRepository {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  list() {
    return [...this.store.storeWifi];
  }

  findPrimaryByStoreId(storeId: number) {
    return this.store.storeWifi.find((wifi) => wifi.storeId === storeId && wifi.isPrimary && wifi.isEnabled);
  }

  save(input: SaveWifiConfigDto): StoreWifiEntity {
    const existing = input.id ? this.store.storeWifi.find((wifi) => wifi.id === input.id) : undefined;
    if (existing) {
      existing.ssid = input.ssid;
      existing.securityType = input.securityType;
      existing.connectMode = input.connectMode;
      existing.isPrimary = input.isPrimary ?? existing.isPrimary;
      existing.isEnabled = input.isEnabled ?? existing.isEnabled;
      existing.allowCopyPassword = input.allowCopyPassword ?? existing.allowCopyPassword;
      existing.showManualFallback = input.showManualFallback ?? existing.showManualFallback;
      existing.passwordViewPolicy = input.passwordViewPolicy ?? existing.passwordViewPolicy;
      existing.remark = input.remark;
      if (input.password) {
        existing.passwordCipher = cipherPassword(input.password);
        existing.passwordMasked = maskPassword(input.password);
      }
      existing.updatedAt = new Date().toISOString();
      return existing;
    }

    const wifi: StoreWifiEntity = {
      id: this.store.nextWifiId(),
      storeId: input.storeId,
      ssid: input.ssid,
      passwordCipher: cipherPassword(input.password),
      passwordMasked: maskPassword(input.password),
      securityType: input.securityType,
      connectMode: input.connectMode,
      isPrimary: input.isPrimary ?? true,
      isEnabled: input.isEnabled ?? true,
      allowCopyPassword: input.allowCopyPassword ?? true,
      showManualFallback: input.showManualFallback ?? true,
      passwordViewPolicy: input.passwordViewPolicy ?? "never_plain",
      remark: input.remark,
      updatedAt: new Date().toISOString(),
    };
    this.store.storeWifi.push(wifi);
    return wifi;
  }

  disable(id: number) {
    const wifi = this.store.storeWifi.find((item) => item.id === id);
    if (wifi) {
      wifi.isEnabled = false;
      wifi.updatedAt = new Date().toISOString();
    }
    return wifi;
  }
}

@Injectable()
export class MemoryWalletRepository implements WalletRepository {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  list() {
    return [...this.store.wallets];
  }

  findByMerchantId(merchantId: number) {
    return this.store.wallets.find((wallet) => wallet.merchantId === merchantId);
  }
}
