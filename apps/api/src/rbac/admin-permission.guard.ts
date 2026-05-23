import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiException, ERROR_CODES } from "../common/errors";
import { ADMIN_PERMISSION } from "./decorators";
import { AdminRole, hasPermission } from "./permissions";

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<string>(ADMIN_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    if (!request.adminAuthenticated) {
      throw new ApiException(ERROR_CODES.ADMIN_FORBIDDEN, "无后台权限", HttpStatus.FORBIDDEN);
    }
    const role = String(request.adminRoleFromToken ?? "") as AdminRole;
    if (!hasPermission(role, permission)) {
      throw new ApiException(ERROR_CODES.ADMIN_FORBIDDEN, "无后台权限", HttpStatus.FORBIDDEN);
    }
    request.adminRole = role;
    return true;
  }
}
