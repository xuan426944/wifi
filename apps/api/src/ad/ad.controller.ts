import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { AdService } from "./ad.service";

@Controller("ad/view")
export class AdController {
  constructor(@Inject(AdService) private readonly adService: AdService) {}

  @Post("start")
  async start(@Req() request: any, @Body() body: { storeId: number }) {
    return ok(await this.adService.start(request.principal.openid, body.storeId));
  }

  @Post("finish")
  async finish(@Body() body: { viewNo: string; isEnded: boolean; closeReason?: string }) {
    return ok(await this.adService.finish(body.viewNo, body.isEnded));
  }
}
