import { Body, Controller, Get, Inject, Post, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { PublicRoute } from "../rbac/decorators";
import { AdminLoginRequest, WxLoginRequest } from "./auth.dto";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @PublicRoute()
  @Post("auth/wx-login")
  async wxLogin(@Body() body: WxLoginRequest) {
    return ok(await this.authService.wxLogin(body));
  }

  @PublicRoute()
  @Post("admin/login")
  adminLogin(@Body() body: AdminLoginRequest) {
    return ok(this.authService.adminLogin(body));
  }

  @Get("auth/me")
  me(@Req() request: any) {
    return ok(this.authService.currentRoutePolicy(request.principal.openid));
  }
}
