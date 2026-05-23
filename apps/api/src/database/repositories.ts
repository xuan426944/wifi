import {
  MerchantEntity,
  MerchantOwnerEntity,
  MerchantWalletEntity,
  StoreEntity,
  StoreWifiEntity,
  UserEntity,
} from "./entities";
import { CreateMerchantDto, CreateStoreDto, SaveWifiConfigDto, UpdateShareRateDto } from "./dtos";

export interface UserRepository {
  findOrCreateByOpenid(openid: string, unionid?: string): UserEntity;
}

export interface MerchantRepository {
  list(): MerchantEntity[];
  findById(id: number): MerchantEntity | undefined;
  create(input: CreateMerchantDto): MerchantEntity;
  updateShareRate(id: number, input: UpdateShareRateDto): MerchantEntity;
  findActiveOwner(openid: string): { owner: MerchantOwnerEntity; merchant: MerchantEntity } | undefined;
}

export interface StoreRepository {
  list(): StoreEntity[];
  findById(id: number): StoreEntity | undefined;
  findByMerchantId(merchantId: number): StoreEntity[];
  create(input: CreateStoreDto): StoreEntity;
  updateShareRate(id: number, input: UpdateShareRateDto): StoreEntity;
}

export interface WifiConfigRepository {
  list(): StoreWifiEntity[];
  findPrimaryByStoreId(storeId: number): StoreWifiEntity | undefined;
  save(input: SaveWifiConfigDto): StoreWifiEntity;
  disable(id: number): StoreWifiEntity | undefined;
}

export interface WalletRepository {
  list(): MerchantWalletEntity[];
  findByMerchantId(merchantId: number): MerchantWalletEntity | undefined;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export const MERCHANT_REPOSITORY = Symbol("MERCHANT_REPOSITORY");
export const STORE_REPOSITORY = Symbol("STORE_REPOSITORY");
export const WIFI_CONFIG_REPOSITORY = Symbol("WIFI_CONFIG_REPOSITORY");
export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
