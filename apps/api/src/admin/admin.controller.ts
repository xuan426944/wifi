import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { emptyPage, ok } from "../common/api-response";
import { ApiException, ERROR_CODES } from "../common/errors";
import { CreateMerchantDto, CreateStoreDto, SaveWifiConfigDto, UpdateShareRateDto } from "../database/dtos";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
  WALLET_REPOSITORY,
  WIFI_CONFIG_REPOSITORY,
  WalletRepository,
  WifiConfigRepository,
} from "../database/repositories";
import { OperationLogService } from "../operation-log/operation-log.service";
import { RequirePermission } from "../rbac/decorators";
import { AdminPermissionGuard } from "../rbac/admin-permission.guard";

@Controller("admin")
@UseGuards(AdminPermissionGuard)
export class AdminController {
  constructor(
    @Inject(MERCHANT_REPOSITORY) private readonly merchantsRepo: MerchantRepository,
    @Inject(STORE_REPOSITORY) private readonly storesRepo: StoreRepository,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiRepo: WifiConfigRepository,
    @Inject(WALLET_REPOSITORY) private readonly walletsRepo: WalletRepository,
    @Inject(OperationLogService) private readonly operationLogs: OperationLogService,
  ) {}

  @Get("dashboard")
  @RequirePermission("admin.dashboard.read")
  dashboard() {
    return ok({
      todayScanUsers: 0,
      todayAdViews: 0,
      todayAdCompletes: 0,
      todayConnectSuccess: 0,
      todayEstimatedRevenueCent: 0,
      todayMerchantShareCent: 0,
      todayPlatformRevenueCent: 0,
      monthSettlementIncomeCent: 0,
      monthWithdrawCent: 0,
      pendingWithdrawCount: 0,
      abnormalRiskEventCount: 0,
      activeStoreCount: this.storesRepo.list().filter((store) => store.status === "active").length,
      emptyState: true,
    });
  }

  @Get("merchants")
  @RequirePermission("admin.dashboard.read")
  merchants(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return ok({
      ...emptyPage(Number(page), Number(pageSize)),
      list: this.merchantsRepo.list().map((merchant) => ({
        ...merchant,
        ownerPhone: this.maskPhone(merchant.ownerPhone),
      })),
      total: this.merchantsRepo.list().length,
    });
  }

  @Get("merchant-applications")
  @RequirePermission("merchant.audit")
  merchantApplications() {
    return ok(emptyPage());
  }

  @Get("merchant-applications/:applicationNo")
  @RequirePermission("merchant.audit")
  merchantApplicationDetail(@Param("applicationNo") applicationNo: string) {
    return ok({ applicationNo, status: "empty_phase_01" });
  }

  @Post("merchant-applications/:applicationNo/approve")
  @RequirePermission("merchant.audit")
  approveMerchantApplication(@Req() request: any, @Param("applicationNo") applicationNo: string) {
    this.log(request, "merchant_application.approve", "merchant_application", applicationNo, {
      createMerchant: true,
      createStore: true,
      bindOwner: true,
      createWifiIfProvided: true,
    });
    return ok({ applicationNo, status: "approved" });
  }

  @Post("merchant-applications/:applicationNo/reject")
  @RequirePermission("merchant.audit")
  rejectMerchantApplication(@Req() request: any, @Param("applicationNo") applicationNo: string) {
    this.log(request, "merchant_application.reject", "merchant_application", applicationNo, { allowResubmit: true });
    return ok({ applicationNo, status: "rejected" });
  }

  @Post("merchants")
  @RequirePermission("merchant.create")
  createMerchant(@Req() request: any, @Body() body: CreateMerchantDto) {
    const merchant = this.merchantsRepo.create(body);
    this.log(request, "merchant.create", "merchant", merchant.id, { merchantNo: merchant.merchantNo });
    return ok(merchant);
  }

  @Get("merchants/:id")
  @RequirePermission("admin.dashboard.read")
  merchantDetail(@Param("id") id: string) {
    const merchantId = Number(id);
    const merchant = this.merchantsRepo.findById(merchantId);
    return ok({
      merchant: merchant ?? null,
      stores: this.storesRepo.findByMerchantId(merchantId),
      walletSummary: this.walletsRepo.findByMerchantId(merchantId) ?? null,
    });
  }

  @Put("merchants/:id")
  @RequirePermission("merchant.create")
  updateMerchant(@Param("id") id: string) {
    return ok({ id: Number(id), updated: true });
  }

  @Post("merchants/:id/audit")
  @RequirePermission("merchant.audit")
  auditMerchant(@Req() request: any, @Param("id") id: string) {
    this.log(request, "merchant.audit", "merchant", id, { status: "reviewed" });
    return ok({ id: Number(id), audited: true });
  }

  @Post("merchants/:id/disable")
  @RequirePermission("merchant.disable")
  disableMerchant(@Req() request: any, @Param("id") id: string) {
    this.log(request, "merchant.disable", "merchant", id, { status: "disabled" });
    return ok({ id: Number(id), disabled: true });
  }

  @Post("merchants/:id/bind-owner")
  @RequirePermission("merchant.audit")
  bindOwner(@Req() request: any, @Param("id") id: string, @Body() body: { openid: string }) {
    this.log(request, "merchant.bind_owner", "merchant", id, { openid: body.openid });
    return ok({ id: Number(id), bound: true });
  }

  @Post("merchants/:id/share-rate")
  @RequirePermission("merchant.share_rate.write")
  updateMerchantShareRate(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: { shareRateBps: number; reason: string; confirm: boolean },
  ) {
    this.assertShareRate(body.shareRateBps, body.reason, body.confirm);
    const merchant = this.merchantsRepo.updateShareRate(Number(id), body);
    this.log(request, "merchant.share_rate.update", "merchant", id, {
      shareRateBps: body.shareRateBps,
      reason: body.reason,
    });
    return ok({ id: merchant.id, shareRateBps: merchant.shareRateBps, effective: "next_event" });
  }

  @Get("stores")
  @RequirePermission("admin.dashboard.read")
  stores() {
    const list = this.storesRepo.list();
    return ok({ ...emptyPage(), list, total: list.length });
  }

  @Post("stores")
  @RequirePermission("store.create")
  createStore(@Req() request: any, @Body() body: CreateStoreDto) {
    const store = this.storesRepo.create(body);
    this.log(request, "store.create", "store", store.id, { storeNo: store.storeNo });
    return ok(store);
  }

  @Get("stores/:id")
  @RequirePermission("admin.dashboard.read")
  storeDetail(@Param("id") id: string) {
    const store = this.storesRepo.findById(Number(id));
    const wifi = this.wifiRepo.findPrimaryByStoreId(Number(id));
    return ok({ store, wifiStatus: wifi ? "已配置" : "未配置", wifi: wifi ? this.sanitizeWifi(wifi) : null });
  }

  @Put("stores/:id")
  @RequirePermission("store.create")
  updateStore(@Param("id") id: string) {
    return ok({ id: Number(id), updated: true });
  }

  @Post("stores/:id/share-rate")
  @RequirePermission("store.share_rate.write")
  updateStoreShareRate(@Req() request: any, @Param("id") id: string, @Body() body: UpdateShareRateDto) {
    this.assertShareRate(body.shareRateBps, body.reason, body.confirm);
    const store = this.storesRepo.updateShareRate(Number(id), body);
    this.log(request, "store.share_rate.update", "store", id, { shareRateBps: body.shareRateBps });
    return ok({ id: store.id, shareRateBps: store.shareRateBps, effective: "next_event" });
  }

  @Get("wifi")
  @RequirePermission("admin.dashboard.read")
  wifiList() {
    const list = this.wifiRepo.list().map((wifi) => this.sanitizeWifi(wifi));
    return ok({ ...emptyPage(), list, total: list.length, emptyText: "未配置" });
  }

  @Post("wifi/save")
  @RequirePermission("wifi.write")
  saveWifi(@Req() request: any, @Body() body: SaveWifiConfigDto) {
    const wifi = this.wifiRepo.save(body);
    this.log(request, "wifi.save", "store_wifi", wifi.id, { ssid: wifi.ssid, passwordMasked: wifi.passwordMasked });
    return ok(this.sanitizeWifi(wifi));
  }

  @Post("wifi/:id/disable")
  @RequirePermission("wifi.write")
  disableWifi(@Req() request: any, @Param("id") id: string) {
    const wifi = this.wifiRepo.disable(Number(id));
    this.log(request, "wifi.disable", "store_wifi", id, { status: "disabled" });
    return ok({ id: Number(id), disabled: Boolean(wifi) });
  }

  @Post("qrcode/generate")
  @RequirePermission("store.create")
  generateQrcode(@Req() request: any) {
    this.log(request, "qrcode.generate", "qrcode", "phase_01", { qrcodeUrl: null });
    return ok({ qrcodeUrl: null, status: "empty_phase_01" });
  }

  @Get("ads")
  @RequirePermission("ads.read")
  ads() {
    return ok(emptyPage());
  }

  @Post("ads")
  @RequirePermission("ads.write")
  createAd() {
    return ok({ id: null, status: "draft" });
  }

  @Post("ads/:id/audit")
  @RequirePermission("ads.write")
  auditAd(@Req() request: any, @Param("id") id: string) {
    this.log(request, "ad.audit", "ad", id, { status: "active" });
    return ok({ id: Number(id), audited: true });
  }

  @Get("campaigns")
  @RequirePermission("ads.read")
  campaigns() {
    return ok(emptyPage());
  }

  @Post("campaigns")
  @RequirePermission("ads.write")
  createCampaign() {
    return ok({ id: null, status: "draft" });
  }

  @Get("revenue")
  @RequirePermission("revenue.read")
  revenue() {
    return ok(emptyPage());
  }

  @Post("settlement/import")
  @RequirePermission("revenue.confirm")
  importSettlement(@Req() request: any) {
    this.log(request, "settlement.import", "settlement", "phase_01", { imported: 0 });
    return ok({ imported: 0, abnormal: 0 });
  }

  @Get("wallets")
  @RequirePermission("wallet.read")
  wallets() {
    const list = this.walletsRepo.list();
    return ok({ ...emptyPage(), list, total: list.length });
  }

  @Get("wallets/:merchantId/ledger")
  @RequirePermission("wallet.read")
  walletLedger(@Param("merchantId") merchantId: string) {
    return ok({ merchantId: Number(merchantId), ...emptyPage() });
  }

  @Post("wallets/adjust")
  @RequirePermission("wallet.adjust")
  adjustWallet(@Req() request: any, @Body() body: { merchantId: number; amountCent: number; reason: string; confirm: boolean }) {
    if (!body.confirm || !body.reason) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "人工调账必须填写原因并二次确认", 400);
    }
    this.log(request, "wallet.adjust.request", "merchant_wallet", body.merchantId, {
      amountCent: body.amountCent,
      reason: body.reason,
      ledgerRequired: true,
    });
    return ok({ status: "pending_approval", ledgerRequired: true });
  }

  @Get("withdraws")
  @RequirePermission("withdraw.read")
  withdraws() {
    return ok(emptyPage());
  }

  @Post("withdraws/:id/review")
  @RequirePermission("withdraw.review")
  reviewWithdraw(@Param("id") id: string) {
    return ok({ id: Number(id), status: "reviewing" });
  }

  @Post("withdraws/:id/approve")
  @RequirePermission("withdraw.review")
  approveWithdraw(@Req() request: any, @Param("id") id: string) {
    this.log(request, "withdraw.approve", "withdraw", id, { transferProvider: "mock" });
    return ok({ id: Number(id), status: "transfer_processing" });
  }

  @Post("withdraws/:id/reject")
  @RequirePermission("withdraw.review")
  rejectWithdraw(@Req() request: any, @Param("id") id: string) {
    this.log(request, "withdraw.reject", "withdraw", id, { ledgerType: "withdraw_failed_unfreeze" });
    return ok({ id: Number(id), status: "rejected" });
  }

  @Post("withdraws/:id/query-transfer")
  @RequirePermission("withdraw.review")
  queryTransfer(@Param("id") id: string) {
    return ok({ id: Number(id), remoteStatus: "mock_pending" });
  }

  @Get("ranking/config")
  @RequirePermission("ranking.read")
  rankingConfig() {
    return ok({ enabled: true, amountDisplayMode: "range", list: [] });
  }

  @Post("ranking/config")
  @RequirePermission("ranking.write")
  saveRankingConfig(@Req() request: any) {
    this.log(request, "ranking.config.save", "ranking_config", "global", { enabled: true });
    return ok({ saved: true });
  }

  @Get("risk/events")
  @RequirePermission("risk.read")
  riskEvents() {
    return ok(emptyPage());
  }

  @Post("risk/events/:id/handle")
  @RequirePermission("risk.handle")
  handleRisk(@Req() request: any, @Param("id") id: string) {
    this.log(request, "risk.handle", "risk_event", id, { status: "handled" });
    return ok({ id: Number(id), handled: true });
  }

  @Get("system/config")
  @RequirePermission("system_config.read")
  systemConfig() {
    return ok({
      configs: [
        { key: "app.auth_mode", value: "mock_wechat", sensitive: false },
        { key: "ad.mode", value: "mock", sensitive: false },
        { key: "wifi.mode", value: "mock", sensitive: false },
        { key: "wechat.app_secret", value: "***", sensitive: true },
      ],
    });
  }

  @Post("system/config")
  @RequirePermission("system_config.read")
  saveSystemConfig(@Req() request: any) {
    this.log(request, "system.config.save", "system_config", "batch", { sensitiveMasked: true });
    return ok({ saved: true });
  }

  @Get("integrations/status")
  @RequirePermission("system_config.read")
  integrationStatus() {
    return ok({
      authMode: "mock_wechat",
      adMode: "mock",
      wifiMode: "mock",
      paymentMode: "mock",
      transferMode: "mock",
      missingProductionItems: ["WECHAT_APP_ID", "WECHAT_PAY_MCH_ID"],
      readyForDevelopment: true,
    });
  }

  @Get("operation-logs")
  @RequirePermission("operation_log.read")
  operationLogList() {
    return ok({ ...emptyPage(), list: this.operationLogs.list(), total: this.operationLogs.list().length });
  }

  @Get("admin-users")
  @RequirePermission("permission.read")
  adminUsers() {
    return ok(emptyPage());
  }

  @Post("admin-users")
  @RequirePermission("permission.read")
  createAdminUser(@Req() request: any) {
    this.log(request, "admin_user.create", "admin_user", "phase_01", {});
    return ok({ id: null, status: "empty_phase_01" });
  }

  @Get("roles")
  @RequirePermission("permission.read")
  roles() {
    return ok({
      list: ["super_admin", "operator", "finance", "risk", "customer_service", "readonly_audit"],
    });
  }

  private assertShareRate(shareRateBps: number, reason: string, confirm: boolean) {
    if (!confirm || !reason || shareRateBps < 0 || shareRateBps > 10000) {
      throw new ApiException(ERROR_CODES.SHARE_RATE_INVALID, "分成比例不合法或未二次确认", 400);
    }
  }

  private log(request: any, action: string, targetType: string, targetId: string | number, after: unknown) {
    this.operationLogs.record({
      actorType: "admin",
      actorId: request.adminRole ?? "unknown",
      action,
      targetType,
      targetId,
      after,
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });
  }

  private maskPhone(phone?: string) {
    return phone ? phone.replace(/(\d{3})\d{4}(\d+)/, "$1****$2") : phone;
  }

  private sanitizeWifi<T extends { passwordCipher?: string }>(wifi: T) {
    const { passwordCipher: _passwordCipher, ...safeWifi } = wifi;
    return safeWifi;
  }
}
