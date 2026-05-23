import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiException, ERROR_CODES } from "../common/errors";
import { decodeMockToken } from "../auth/role-context";
import { PUBLIC_ROUTE } from "./decorators";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const auth = String(request.headers.authorization ?? "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (token?.startsWith("admin.mock.")) {
      request.adminAuthenticated = true;
      request.adminRoleFromToken = token.slice("admin.mock.".length);
      return true;
    }
    const principal = decodeMockToken(token);
    if (!principal) {
      throw new ApiException(ERROR_CODES.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
    }
    request.principal = principal;
    return true;
  }
}
