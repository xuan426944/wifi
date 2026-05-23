import { Controller, Get, Inject, Post, Query, Req, UseGuards } from "@nestjs/common";
import { emptyPage, ok } from "../common/api-response";
import { InMemoryStore } from "../database/in-memory-store";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
  WALLET_REPOSITORY,
  WalletRepository,
} from "../database/repositories";
import { MerchantRoute } from "../rbac/decorators";
import { MerchantGuard } from "../rbac/merchant.guard";
import { RevenueService } from "../revenue/revenue.service";

@Controller("merchant")
@UseGuards(MerchantGuard)
@MerchantRoute()
export class MerchantController {
  constructor(
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(WALLET_REPOSITORY) private readonly wallets: WalletRepository,
    @Inject(RevenueService) private readonly revenues: RevenueService,
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
  ) {}

  @Get("dashboard")
  dashboard(@Req() request: any) {
    const merchantId = request.principal.roleContext.merchantId;
    const merchant = merchantId ? this.merchants.findById(merchantId) : undefined;
    const revenueSummary = merchantId ? this.revenues.summary(merchantId) : undefined;
    const wallet = merchantId ? this.wallets.findByMerchantId(merchantId) : undefined;
    const storeIds = merchantId ? this.stores.findByMerchantId(merchantId).map((store) => store.id) : [];
    return ok({
      merchantId,
      merchantName: merchant?.name,
      todayEstimatedCent: revenueSummary?.estimatedCent ?? 0,
      yesterdayConfirmedCent: revenueSummary?.confirmedCent ?? 0,
      monthRevenueCent: revenueSummary?.confirmedCent ?? 0,
      totalRevenueCent: revenueSummary?.totalRevenueCent ?? 0,
      availableCent: wallet?.availableCent ?? 0,
      withdrawingCent: wallet?.frozenWithdrawCent ?? 0,
      frozenRiskCent: wallet?.frozenRiskCent ?? 0,
      todayScanCount: this.memoryStore.scanLogs.filter((log) => storeIds.includes(log.storeId)).length,
      todayAdCompleteCount: this.memoryStore.revenueRecords.filter((record) => record.merchantId === merchantId).length,
      todayConnectSuccessCount: this.memoryStore.wifiConnectLogs.filter(
        (log) => storeIds.includes(log.storeId) && log.status === "success",
      ).length,
      currentRank: null,
      shareRateBps: merchant?.shareRateBps ?? 5000,
      emptyState: (revenueSummary?.recordCount ?? 0) === 0,
      revenueEstimateNotice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
    });
  }

  @Get("revenue")
  revenue(@Req() request: any, @Query("page") page = "1", @Query("pageSize") pageSize = "20", @Query("status") status?: string) {
    const merchantId = request.principal.roleContext.merchantId;
    const list = merchantId ? this.revenues.list({ merchantId, status }) : [];
    return ok({
      ...emptyPage(Number(page), Number(pageSize)),
      list,
      total: list.length,
      revenueEstimateNotice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
    });
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
