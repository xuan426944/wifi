import { Body, Controller, Inject, Post } from "@nestjs/common";
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
  adminLogin(@Body() _body: AdminLoginRequest) {
    return ok(this.authService.adminLogin());
  }
}
