import { Body, Controller, Get, Inject, Param, Post, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { SubmitMerchantApplicationDto } from "../database/dtos";
import { MerchantApplicationService } from "./merchant-application.service";

@Controller("merchant/applications")
export class MerchantApplicationController {
  constructor(@Inject(MerchantApplicationService) private readonly applications: MerchantApplicationService) {}

  @Post()
  submit(@Req() request: any, @Body() body: SubmitMerchantApplicationDto) {
    return ok(this.applications.submit(request.principal.openid, body));
  }

  @Get("my/latest")
  latest(@Req() request: any) {
    return ok(this.applications.latest(request.principal.openid, request.principal.roleContext.canViewMerchantPages));
  }

  @Post(":applicationNo/cancel")
  cancel(@Req() request: any, @Param("applicationNo") applicationNo: string) {
    return ok(this.applications.cancel(request.principal.openid, applicationNo));
  }
}
