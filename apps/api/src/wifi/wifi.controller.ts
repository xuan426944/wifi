import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import { ok } from "../common/api-response";
import { WifiService } from "./wifi.service";

@Controller("wifi")
export class WifiController {
  constructor(@Inject(WifiService) private readonly wifiService: WifiService) {}

  @Post("reward-token")
  rewardToken(@Req() request: any, @Body() body: { storeId: number; viewNo: string }) {
    return ok(
      this.wifiService.createRewardToken({
        openid: request.principal.openid,
        storeId: body.storeId,
        viewNo: body.viewNo,
      }),
    );
  }

  @Post("connect-info")
  async connectInfo(@Req() request: any, @Body() body: { rewardToken: string }) {
    return ok(await this.wifiService.connectInfo(request.principal.openid, body.rewardToken));
  }

  @Post("connect-result")
  connectResult(
    @Req() request: any,
    @Body() body: { storeId: number; rewardToken?: string; status: string; failReason?: string },
  ) {
    return ok(this.wifiService.reportResult({ openid: request.principal.openid, ...body }));
  }
}
