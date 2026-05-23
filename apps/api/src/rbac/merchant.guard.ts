import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiException, ERROR_CODES } from "../common/errors";
import { MERCHANT_REPOSITORY, MerchantRepository } from "../database/repositories";
import { MERCHANT_ROUTE } from "./decorators";

@Injectable()
export class MerchantGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isMerchantRoute = this.reflector.getAllAndOverride<boolean>(MERCHANT_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isMerchantRoute) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const principal = request.principal;
    const owner = principal?.openid ? this.merchants.findActiveOwner(principal.openid) : undefined;
    const canViewMerchantPages =
      Boolean(owner) && owner?.merchant.status === "active" && principal?.roleContext?.canViewMerchantPages === true;
    if (!canViewMerchantPages) {
      throw new ApiException(
        ERROR_CODES.MERCHANT_PERMISSION_REQUIRED,
        "当前微信未绑定授权商户",
        HttpStatus.FORBIDDEN,
      );
    }
    request.merchantContext = {
      merchantId: owner?.merchant.id,
      merchantStatus: owner?.merchant.status,
    };
    return true;
  }
}
