import {
  MerchantEntity,
  MerchantOwnerEntity,
  MerchantWalletEntity,
  QrcodeEntity,
  WalletLedgerEntity,
  StoreEntity,
  StoreWifiEntity,
  UserEntity,
} from "./entities";
import { CreateMerchantDto, CreateStoreDto, SaveWifiConfigDto, UpdateShareRateDto, UpdateStoreDto } from "./dtos";

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
  update(id: number, input: UpdateStoreDto): StoreEntity | undefined;
  setStatus(id: number, status: StoreEntity["status"]): StoreEntity | undefined;
  updateShareRate(id: number, input: UpdateShareRateDto): StoreEntity;
}

export interface WifiConfigRepository {
  list(): StoreWifiEntity[];
  findById(id: number): StoreWifiEntity | undefined;
  findPrimaryByStoreId(storeId: number): StoreWifiEntity | undefined;
  save(input: SaveWifiConfigDto): StoreWifiEntity;
  setEnabled(id: number, isEnabled: boolean): StoreWifiEntity | undefined;
  copyPassword(id: number): string | undefined;
}

export interface QrcodeRepository {
  list(): QrcodeEntity[];
  findByScene(scene: string): QrcodeEntity | undefined;
  findActiveByStoreId(storeId: number): QrcodeEntity | undefined;
  generate(storeId: number): QrcodeEntity;
}

export interface WalletRepository {
  list(): MerchantWalletEntity[];
  findByMerchantId(merchantId: number): MerchantWalletEntity | undefined;
  ledgerByMerchantId(merchantId: number): WalletLedgerEntity[];
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export const MERCHANT_REPOSITORY = Symbol("MERCHANT_REPOSITORY");
export const STORE_REPOSITORY = Symbol("STORE_REPOSITORY");
export const WIFI_CONFIG_REPOSITORY = Symbol("WIFI_CONFIG_REPOSITORY");
export const QRCODE_REPOSITORY = Symbol("QRCODE_REPOSITORY");
export const WALLET_REPOSITORY = Symbol("WALLET_REPOSITORY");
