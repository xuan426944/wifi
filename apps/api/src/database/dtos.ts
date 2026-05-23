import { WifiConnectMode, WifiSecurityType } from "./entities";

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
