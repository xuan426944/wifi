import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
  USER_REPOSITORY,
  UserRepository,
} from "../database/repositories";
import { InMemoryStore } from "../database/in-memory-store";
import { AUTH_PROVIDER, AuthProvider } from "../providers/provider.interfaces";
import { ROLE_PERMISSIONS, resolveMockAdminRole } from "../rbac/permissions";
import { encodeMockToken, Principal, RoleContext } from "./role-context";
import { buildRoutePolicy } from "./route-policy";

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
  ) {}

  async wxLogin(input: { code: string; mockOpenid?: string }) {
    const session = await this.authProvider.code2Session(input.code, input.mockOpenid);
    this.users.findOrCreateByOpenid(session.openid, session.unionid);
    const roleContext = this.buildRoleContext(session.openid);
    const principal: Principal = { openid: session.openid, roleContext };
    return {
      token: encodeMockToken(principal),
      roleContext,
      routePolicy: buildRoutePolicy(roleContext),
    };
  }

  adminLogin(input: { username?: string; password?: string } = {}) {
    const username = input.username?.trim() || "admin";
    const adminUser = this.memoryStore.adminUsers.find((user) => user.username === username);
    if (adminUser?.status === "disabled") {
      throw new ApiException(ERROR_CODES.ADMIN_FORBIDDEN, "账号禁用", HttpStatus.FORBIDDEN);
    }
    const role = adminUser?.role ?? resolveMockAdminRole(username);
    if (adminUser) {
      adminUser.lastLoginAt = new Date().toISOString();
      adminUser.updatedAt = adminUser.lastLoginAt;
    }
    return {
      token: `admin.mock.${role}`,
      permissions: ROLE_PERMISSIONS[role],
      roles: [role],
    };
  }

  currentRoutePolicy(openid: string) {
    const roleContext = this.buildRoleContext(openid);
    return {
      roleContext,
      routePolicy: buildRoutePolicy(roleContext),
    };
  }

  buildRoleContext(openid: string): RoleContext {
    const owner = this.merchants.findActiveOwner(openid);
    if (!owner || owner.merchant.status !== "active") {
      return {
        openid,
        isMerchantOwner: Boolean(owner),
        merchantStatus: owner?.merchant.status ?? "none",
        merchantId: owner?.merchant.id ?? null,
        storeCount: owner ? this.stores.findByMerchantId(owner.merchant.id).length : 0,
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
