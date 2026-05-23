import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import { ok } from "../common/api-response";
import { RankingService } from "../ranking/ranking.service";
import { MerchantRoute } from "../rbac/decorators";
import { MerchantGuard } from "../rbac/merchant.guard";

@Controller("ranking")
@UseGuards(MerchantGuard)
@MerchantRoute()
export class RankingController {
  constructor(@Inject(RankingService) private readonly rankings: RankingService) {}

  @Get("store")
  storeRanking(@Req() request: any, @Query("type") type = "today_revenue") {
    return ok(
      this.rankings.storeRanking({
        type,
        merchantId: request.merchantContext?.merchantId,
      }),
    );
  }
}
