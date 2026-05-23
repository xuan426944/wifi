import { MerchantStatus, WifiConnectMode, WifiSecurityType } from "./entities";

export interface CreateMerchantDto {
  name: string;
  ownerName?: string;
  ownerPhone?: string;
  city?: string;
  industry?: string;
  shareRateBps?: number | null;
}

export interface UpdateShareRateDto {
  shareRateBps: number;
  reason: string;
  confirm: boolean;
}

export interface CreateStoreDto {
  merchantId: number;
  name: string;
  city?: string;
  district?: string;
  address?: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
  shareRateBps?: number | null;
  status?: MerchantStatus;
}

export interface UpdateStoreDto {
  merchantId?: number;
  name?: string;
  city?: string;
  district?: string;
  address?: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
  shareRateBps?: number | null;
  status?: MerchantStatus;
}

export interface SaveWifiConfigDto {
  id?: number | null;
  storeId: number;
  ssid: string;
  password?: string;
  securityType: WifiSecurityType;
  connectMode: WifiConnectMode;
  isPrimary?: boolean;
  isEnabled?: boolean;
  allowCopyPassword?: boolean;
  showManualFallback?: boolean;
  passwordViewPolicy?: "never_plain" | "copy_only" | "second_confirm_plain";
  remark?: string;
}

export interface SubmitMerchantApplicationDto {
  sourceStoreId?: number | null;
  merchantName?: string;
  applicantName: string;
  applicantPhone: string;
  storeName: string;
  city: string;
  district?: string;
  address: string;
  industry: string;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  remark?: string | null;
  agreeMerchantTerms: boolean;
}

export interface ApproveMerchantApplicationDto {
  createMerchant?: boolean;
  createStore?: boolean;
  bindOwner?: boolean;
  createWifiIfProvided?: boolean;
  merchantShareRateBps?: number | null;
  storeShareRateBps?: number | null;
  reviewRemark?: string;
  reason?: string;
  confirm?: boolean;
}

export interface RejectMerchantApplicationDto {
  rejectReason?: string;
  reason?: string;
  allowResubmit?: boolean;
  confirm?: boolean;
}
