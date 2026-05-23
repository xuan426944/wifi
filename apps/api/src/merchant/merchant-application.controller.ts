import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { ok } from "../common/api-response";

@Controller("merchant/applications")
export class MerchantApplicationController {
  @Post()
  submit(@Req() request: any, @Body() body: { applicantName: string; applicantPhone: string; agreeMerchantTerms: boolean }) {
    return ok({
      applicationNo: `MA${Date.now()}`,
      status: body.agreeMerchantTerms ? "submitted" : "draft",
      applicantName: body.applicantName,
      applicantPhoneMasked: body.applicantPhone?.replace(/(\d{3})\d{4}(\d+)/, "$1****$2"),
      openid: request.principal.openid,
      wifiOptional: true,
    });
  }

  @Get("my/latest")
  latest(@Req() request: any) {
    return ok({
      openid: request.principal.openid,
      hasActiveMerchant: request.principal.roleContext.canViewMerchantPages,
      latestApplicationStatus: null,
    });
  }

  @Post(":applicationNo/cancel")
  cancel(@Param("applicationNo") applicationNo: string) {
    return ok({ applicationNo, status: "canceled" });
  }
}
