import { Inject, Injectable } from "@nestjs/common";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
  USER_REPOSITORY,
  UserRepository,
} from "../database/repositories";
import { AUTH_PROVIDER, AuthProvider } from "../providers/provider.interfaces";
import { encodeMockToken, Principal, RoleContext } from "./role-context";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
  ) {}

  async wxLogin(input: { code: string; mockOpenid?: string }) {
    const session = await this.authProvider.code2Session(input.code, input.mockOpenid);
    this.users.findOrCreateByOpenid(session.openid, session.unionid);
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
    const owner = this.merchants.findActiveOwner(openid);
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

    const storeCount = this.stores.findByMerchantId(owner.merchant.id).length;
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
