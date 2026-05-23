import { Controller, Get, Inject, Post, Query, Req, UseGuards } from "@nestjs/common";
import { emptyPage, ok } from "../common/api-response";
import { MERCHANT_REPOSITORY, MerchantRepository } from "../database/repositories";
import { MerchantRoute } from "../rbac/decorators";
import { MerchantGuard } from "../rbac/merchant.guard";

@Controller("merchant")
@UseGuards(MerchantGuard)
@MerchantRoute()
export class MerchantController {
  constructor(@Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository) {}

  @Get("dashboard")
  dashboard(@Req() request: any) {
    const merchantId = request.principal.roleContext.merchantId;
    const merchant = merchantId ? this.merchants.findById(merchantId) : undefined;
    return ok({
      merchantId,
      merchantName: merchant?.name,
      todayEstimatedCent: 0,
      yesterdayConfirmedCent: 0,
      monthRevenueCent: 0,
      totalRevenueCent: 0,
      availableCent: 0,
      withdrawingCent: 0,
      frozenRiskCent: 0,
      todayScanCount: 0,
      todayAdCompleteCount: 0,
      todayConnectSuccessCount: 0,
      currentRank: null,
      shareRateBps: merchant?.shareRateBps ?? 5000,
      emptyState: true,
      revenueEstimateNotice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
    });
  }

  @Get("revenue")
  revenue(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return ok(emptyPage(Number(page), Number(pageSize)));
  }

  @Post("withdraw/apply")
  withdrawApply() {
    return ok({
      withdrawNo: null,
      status: "empty_phase_01",
      notice: "Phase 01 仅初始化提现接口骨架，余额变动必须在 wallet_ledger 中完成",
    });
  }

  @Get("withdraws")
  withdraws(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return ok(emptyPage(Number(page), Number(pageSize)));
  }
}
