export interface RoleContext {
  openid: string;
  isMerchantOwner: boolean;
  merchantStatus: "none" | "pending" | "active" | "disabled" | "risk_frozen";
  merchantId: number | null;
  storeCount: number;
  defaultLanding: "wifi" | "merchant_dashboard";
  canViewMerchantPages: boolean;
  canWithdraw: boolean;
}

export interface Principal {
  openid: string;
  roleContext: RoleContext;
}

export const encodeMockToken = (principal: Principal): string =>
  `mock.${Buffer.from(JSON.stringify(principal), "utf8").toString("base64url")}`;

export const decodeMockToken = (token?: string): Principal | undefined => {
  if (!token?.startsWith("mock.")) {
    return undefined;
  }
  try {
    return JSON.parse(Buffer.from(token.slice(5), "base64url").toString("utf8")) as Principal;
  } catch {
    return undefined;
  }
};
