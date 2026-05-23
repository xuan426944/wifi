import { Inject, Injectable } from "@nestjs/common";
import { InMemoryStore } from "../database/in-memory-store";
import { AUTH_PROVIDER, AuthProvider } from "../providers/provider.interfaces";
import { encodeMockToken, Principal, RoleContext } from "./role-context";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    @Inject(InMemoryStore) private readonly store: InMemoryStore,
  ) {}

  async wxLogin(input: { code: string; mockOpenid?: string }) {
    const session = await this.authProvider.code2Session(input.code, input.mockOpenid);
    const roleContext = this.buildRoleContext(session.openid);
    const principal: Principal = { openid: session.openid, roleContext };
    return {
      token: encodeMockToken(principal),
      roleContext,
    };
  }

  adminLogin() {
    return {
      token: "admin.mock.super_admin",
      permissions: ["*"],
      roles: ["super_admin"],
    };
  }

  buildRoleContext(openid: string): RoleContext {
    const owner = this.store.findMerchantOwner(openid);
    if (!owner || owner.merchant.status !== "active") {
      return {
        openid,
        isMerchantOwner: false,
        merchantStatus: owner?.merchant.status ?? "none",
        merchantId: owner?.merchant.id ?? null,
        storeCount: 0,
        defaultLanding: "wifi",
        canViewMerchantPages: false,
        canWithdraw: false,
      };
    }

    const storeCount = this.store.stores.filter((store) => store.merchantId === owner.merchant.id).length;
    return {
      openid,
      isMerchantOwner: true,
      merchantStatus: "active",
      merchantId: owner.merchant.id,
      storeCount,
      defaultLanding: "wifi",
      canViewMerchantPages: true,
      canWithdraw: owner.merchant.riskStatus === "normal",
    };
  }
}
