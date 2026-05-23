import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ok } from "../common/api-response";
import { MerchantRoute } from "../rbac/decorators";
import { MerchantGuard } from "../rbac/merchant.guard";

@Controller("ranking")
@UseGuards(MerchantGuard)
@MerchantRoute()
export class RankingController {
  @Get("store")
  storeRanking(@Query("type") type = "today_revenue") {
    return ok({
      type,
      displayMode: "range",
      list: [],
      emptyState: true,
    });
  }
}
