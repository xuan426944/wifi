import { Body, Controller, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { emptyPage, ok } from "../common/api-response";
import { ApiException, ERROR_CODES } from "../common/errors";
import { ConfigCenterService } from "../config/config-center.service";
import {
  ApproveMerchantApplicationDto,
  CreateMerchantDto,
  CreateStoreDto,
  RejectMerchantApplicationDto,
  SaveWifiConfigDto,
  UpdateShareRateDto,
  UpdateStoreDto,
} from "../database/dtos";
import { RankingConfigEntity } from "../database/entities";
import { InMemoryStore } from "../database/in-memory-store";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  QRCODE_REPOSITORY,
  QrcodeRepository,
  STORE_REPOSITORY,
  StoreRepository,
  WALLET_REPOSITORY,
  WIFI_CONFIG_REPOSITORY,
  WalletRepository,
  WifiConfigRepository,
} from "../database/repositories";
import { MerchantApplicationService } from "../merchant/merchant-application.service";
import { OperationLogService } from "../operation-log/operation-log.service";
import { RankingService } from "../ranking/ranking.service";
import { ReconciliationService } from "../reconciliation/reconciliation.service";
import { RequirePermission } from "../rbac/decorators";
import { AdminPermissionGuard } from "../rbac/admin-permission.guard";
import { RevenueService } from "../revenue/revenue.service";
import { RiskService } from "../risk/risk.service";
import { WithdrawService } from "../withdraw/withdraw.service";

const WIFI_SECURITY_TYPES = ["none", "WEP", "WPA", "WPA2", "WPA3"] as const;
const WIFI_CONNECT_MODES = ["mock", "wechat", "manual"] as const;
const PASSWORD_VIEW_POLICIES = ["never_plain", "copy_only", "second_confirm_plain"] as const;

@Controller("admin")
@UseGuards(AdminPermissionGuard)
export class AdminController {
  constructor(
    @Inject(MERCHANT_REPOSITORY) private readonly merchantsRepo: MerchantRepository,
    @Inject(STORE_REPOSITORY) private readonly storesRepo: StoreRepository,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiRepo: WifiConfigRepository,
    @Inject(QRCODE_REPOSITORY) private readonly qrcodesRepo: QrcodeRepository,
    @Inject(WALLET_REPOSITORY) private readonly walletsRepo: WalletRepository,
    @Inject(OperationLogService) private readonly operationLogs: OperationLogService,
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
    @Inject(RevenueService) private readonly revenues: RevenueService,
    @Inject(WithdrawService) private readonly withdrawsService: WithdrawService,
    @Inject(RankingService) private readonly rankings: RankingService,
    @Inject(RiskService) private readonly risks: RiskService,
    @Inject(ConfigCenterService) private readonly configCenter: ConfigCenterService,
    @Inject(MerchantApplicationService) private readonly merchantApplicationsService: MerchantApplicationService,
    @Inject(ReconciliationService) private readonly reconciliations: ReconciliationService,
  ) {}

  @Get("dashboard")
  @RequirePermission("admin.dashboard.read")
  dashboard() {
    const adViews = [...this.memoryStore.adViews.values()];
    const allRevenueSummary = this.memoryStore.revenueRecords.reduce(
      (sum, record) => ({
        estimated: sum.estimated + (record.status === "estimated" ? record.merchantAmountCent : 0),
        confirmed: sum.confirmed + (record.status === "withdrawable" ? record.merchantAmountCent : 0),
        platform: sum.platform + record.platformAmountCent,
      }),
      { estimated: 0, confirmed: 0, platform: 0 },
    );
    return ok({
      todayScanUsers: new Set(this.memoryStore.scanLogs.map((log) => log.openid)).size,
      todayAdViews: adViews.length,
      todayAdCompletes: adViews.filter((view) => view.isEffective).length,
      todayConnectSuccess: this.memoryStore.wifiConnectLogs.filter((log) => log.status === "success").length,
      todayEstimatedRevenueCent: allRevenueSummary.estimated,
      todayMerchantShareCent: allRevenueSummary.confirmed,
      todayPlatformRevenueCent: allRevenueSummary.platform,
      monthSettlementIncomeCent: allRevenueSummary.confirmed,
      monthWithdrawCent: 0,
      pendingWithdrawCount: this.memoryStore.withdrawRecords.filter((record) =>
        ["frozen", "reviewing", "transfer_processing"].includes(record.status),
      ).length,
      abnormalRiskEventCount: this.risks.list({ status: "open" }).length,
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
  merchantApplications(@Query("status") status?: string, @Query("keyword") keyword?: string) {
    const list = this.merchantApplicationsService.list({ status, keyword });
    return ok({ ...emptyPage(), list, total: list.length });
  }

  @Get("merchant-applications/:applicationNo")
  @RequirePermission("merchant.audit")
  merchantApplicationDetail(@Param("applicationNo") applicationNo: string) {
    return ok(this.merchantApplicationsService.detail(applicationNo));
  }

  @Post("merchant-applications/:applicationNo/approve")
  @RequirePermission("merchant.audit")
  approveMerchantApplication(
    @Req() request: any,
    @Param("applicationNo") applicationNo: string,
    @Body() body: ApproveMerchantApplicationDto,
  ) {
    const result = this.merchantApplicationsService.approve(applicationNo, body, request.adminRole);
    this.log(request, "merchant_application.approve", "merchant_application", applicationNo, {
      createMerchant: true,
      createStore: true,
      bindOwner: true,
      createWifiIfProvided: true,
      createdMerchantId: result.createdMerchantId,
      createdStoreId: result.createdStoreId,
      wifiCreated: result.wifiCreated,
    });
    return ok(result);
  }

  @Post("merchant-applications/:applicationNo/reject")
  @RequirePermission("merchant.audit")
  rejectMerchantApplication(
    @Req() request: any,
    @Param("applicationNo") applicationNo: string,
    @Body() body: RejectMerchantApplicationDto,
  ) {
    const result = this.merchantApplicationsService.reject(applicationNo, body, request.adminRole);
    this.log(request, "merchant_application.reject", "merchant_application", applicationNo, {
      allowResubmit: result.allowResubmit,
      rejectReason: result.rejectReason,
    });
    return ok(result);
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
    const list = this.storesRepo.list().map((store) => this.serializeStore(store));
    return ok({ ...emptyPage(), list, total: list.length });
  }

  @Post("stores")
  @RequirePermission("store.create")
  createStore(@Req() request: any, @Body() body: CreateStoreDto) {
    this.assertStoreInput(body, true);
    const store = this.storesRepo.create(body);
    this.log(request, "store.create", "store", store.id, { storeNo: store.storeNo });
    return ok(this.serializeStore(store));
  }

  @Get("stores/:id")
  @RequirePermission("admin.dashboard.read")
  storeDetail(@Param("id") id: string) {
    const store = this.storesRepo.findById(Number(id));
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    const wifi = this.findStoreWifiForAdmin(Number(id));
    const qrcode = this.qrcodesRepo.findActiveByStoreId(Number(id));
    return ok({
      store: this.serializeStore(store),
      wifiStatus: this.wifiStatusText(wifi),
      wifi: wifi ? this.sanitizeWifi(wifi) : null,
      qrcodeStatus: qrcode ? "已生成" : "未生成",
      qrcode,
    });
  }

  @Put("stores/:id")
  @RequirePermission("store.create")
  updateStore(@Req() request: any, @Param("id") id: string, @Body() body: UpdateStoreDto) {
    this.assertStoreInput({ ...body, merchantId: body.merchantId ?? this.storesRepo.findById(Number(id))?.merchantId }, false);
    const store = this.storesRepo.update(Number(id), body);
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    this.log(request, "store.update", "store", id, { storeNo: store.storeNo });
    return ok(this.serializeStore(store));
  }

  @Post("stores/:id/disable")
  @RequirePermission("store.create")
  disableStore(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "禁用门店必须填写原因并二次确认");
    const store = this.storesRepo.setStatus(Number(id), "disabled");
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    this.log(request, "store.disable", "store", id, { status: "disabled", reason: body.reason });
    return ok(this.serializeStore(store));
  }

  @Post("stores/:id/enable")
  @RequirePermission("store.create")
  enableStore(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "启用门店必须填写原因并二次确认");
    const store = this.storesRepo.setStatus(Number(id), "active");
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    this.log(request, "store.enable", "store", id, { status: "active", reason: body.reason });
    return ok(this.serializeStore(store));
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
    const stores = this.storesRepo.list();
    const list = stores.map((store) => {
      const wifi = this.findStoreWifiForAdmin(store.id);
      return {
        ...(wifi ? this.sanitizeWifi(wifi) : { ssid: null, passwordMasked: "未配置" }),
        id: wifi?.id ?? null,
        storeId: store.id,
        storeName: store.name,
        merchantId: store.merchantId,
        merchantName: this.merchantsRepo.findById(store.merchantId)?.name ?? null,
        wifiStatus: this.wifiStatusText(wifi),
      };
    });
    return ok({ ...emptyPage(), list, total: list.length, emptyText: "未配置" });
  }

  @Post("wifi/save")
  @RequirePermission("wifi.write")
  saveWifi(@Req() request: any, @Body() body: SaveWifiConfigDto) {
    const wifiInput = this.normalizeWifiInput(body);
    const wifi = this.wifiRepo.save(wifiInput);
    this.log(request, "wifi.save", "store_wifi", wifi.id, { ssid: wifi.ssid, passwordMasked: wifi.passwordMasked });
    return ok(this.sanitizeWifi(wifi));
  }

  @Post("wifi/:id/disable")
  @RequirePermission("wifi.write")
  disableWifi(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "禁用 WiFi 必须填写原因并二次确认");
    const wifi = this.wifiRepo.setEnabled(Number(id), false);
    if (!wifi) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "WiFi 配置不存在", 404);
    }
    this.log(request, "wifi.disable", "store_wifi", id, { status: "disabled", reason: body.reason });
    return ok(this.sanitizeWifi(wifi));
  }

  @Post("wifi/:id/enable")
  @RequirePermission("wifi.write")
  enableWifi(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "启用 WiFi 必须填写原因并二次确认");
    const wifi = this.wifiRepo.setEnabled(Number(id), true);
    if (!wifi) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "WiFi 配置不存在", 404);
    }
    this.log(request, "wifi.enable", "store_wifi", id, { status: "enabled", reason: body.reason });
    return ok(this.sanitizeWifi(wifi));
  }

  @Post("wifi/:id/copy-password")
  @RequirePermission("wifi.password.copy")
  copyWifiPassword(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "复制 WiFi 密码必须填写原因并二次确认");
    const wifi = this.wifiRepo.findById(Number(id));
    if (!wifi) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "WiFi 配置不存在", 404);
    }
    if (!wifi.allowCopyPassword) {
      throw new ApiException(ERROR_CODES.ADMIN_FORBIDDEN, "当前 WiFi 不允许复制密码", 403);
    }
    const password = this.wifiRepo.copyPassword(wifi.id);
    this.log(request, "wifi.password.copy", "store_wifi", id, {
      ssid: wifi.ssid,
      passwordMasked: wifi.passwordMasked,
      reason: body.reason,
    });
    return ok({
      id: wifi.id,
      storeId: wifi.storeId,
      ssid: wifi.ssid,
      password,
      securityType: wifi.securityType,
      copyNotice: "仅用于门店现场连接支持，请勿外泄",
      manualFallbackSteps: ["复制 WiFi 名称", "复制 WiFi 密码", "打开系统设置并手动连接", "返回首页"],
    });
  }

  @Post("qrcode/generate")
  @RequirePermission("store.create")
  generateQrcode(@Req() request: any, @Body() body: { storeId: number }) {
    const store = this.storesRepo.findById(Number(body.storeId));
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    const qrcode = this.qrcodesRepo.generate(store.id);
    this.log(request, "qrcode.generate", "qrcode", qrcode.id, {
      storeId: store.id,
      scene: qrcode.scene,
      qrcodeUrl: qrcode.qrcodeUrl,
    });
    return ok(qrcode);
  }

  @Get("qrcodes")
  @RequirePermission("admin.dashboard.read")
  qrcodes() {
    const list = this.qrcodesRepo.list().map((qrcode) => {
      const store = this.storesRepo.findById(qrcode.storeId);
      const merchant = store ? this.merchantsRepo.findById(store.merchantId) : undefined;
      return {
        ...qrcode,
        storeName: store?.name ?? null,
        merchantName: merchant?.name ?? null,
      };
    });
    return ok({ ...emptyPage(), list, total: list.length });
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
  revenue(@Query("page") page = "1", @Query("pageSize") pageSize = "20", @Query("status") status?: string) {
    const list = this.revenues.list({ status });
    return ok({ ...emptyPage(Number(page), Number(pageSize)), list, total: list.length });
  }

  @Post("settlement/import")
  @RequirePermission("revenue.confirm")
  importSettlement(
    @Req() request: any,
    @Body() body: { revenueNos?: string[]; settlementBatchId?: number; confirm?: boolean; remark?: string } = {},
  ) {
    const result = this.revenues.confirmEstimated({
      revenueNos: body.revenueNos,
      settlementBatchId: body.settlementBatchId,
      operatorRole: request.adminRole,
      remark: body.remark,
    });
    this.log(request, "settlement.import", "settlement", result.settlementBatchId, {
      imported: result.imported,
      confirmed: result.confirmed,
      abnormal: result.abnormal,
      walletLedgerRequired: true,
    });
    return ok(result);
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
    const list = this.walletsRepo.ledgerByMerchantId(Number(merchantId));
    return ok({ merchantId: Number(merchantId), ...emptyPage(), list, total: list.length });
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
  withdraws(@Query("page") page = "1", @Query("pageSize") pageSize = "20", @Query("status") status?: string) {
    const list = this.withdrawsService.list({ status });
    return ok({ ...emptyPage(Number(page), Number(pageSize)), list, total: list.length });
  }

  @Post("withdraws/:id/review")
  @RequirePermission("withdraw.review")
  reviewWithdraw(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string }) {
    const result = this.withdrawsService.review(Number(id), body.reason);
    this.log(request, "withdraw.review", "withdraw", id, { status: result.status, reason: body.reason });
    return ok(result);
  }

  @Post("withdraws/:id/approve")
  @RequirePermission("withdraw.review")
  async approveWithdraw(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "审核通过必须填写原因并二次确认");
    const result = await this.withdrawsService.approve(Number(id), body.reason);
    this.log(request, "withdraw.approve", "withdraw", id, {
      status: result.status,
      outBillNo: result.outBillNo,
      transferProvider: "mock",
    });
    return ok(result);
  }

  @Post("withdraws/:id/reject")
  @RequirePermission("withdraw.review")
  rejectWithdraw(@Req() request: any, @Param("id") id: string, @Body() body: { reason?: string; confirm?: boolean }) {
    this.assertConfirm(body.confirm, body.reason, "审核拒绝必须填写原因并二次确认");
    const result = this.withdrawsService.reject(Number(id), body.reason ?? "rejected");
    this.log(request, "withdraw.reject", "withdraw", id, { ledgerType: "withdraw_failed_unfreeze", reason: body.reason });
    return ok(result);
  }

  @Post("withdraws/:id/query-transfer")
  @RequirePermission("withdraw.review")
  async queryTransfer(@Req() request: any, @Param("id") id: string) {
    const result = await this.withdrawsService.queryTransfer(Number(id));
    this.log(request, "withdraw.query_transfer", "withdraw", id, {
      remoteStatus: result.remoteStatus,
      localStatus: result.status,
      outBillNo: result.outBillNo,
    });
    return ok(result);
  }

  @Get("reconciliation")
  @RequirePermission("reconciliation.read")
  reconciliation(@Query("page") page = "1", @Query("pageSize") pageSize = "20") {
    return ok(this.reconciliations.list({ page: Number(page), pageSize: Number(pageSize) }));
  }

  @Post("reconciliation/run")
  @RequirePermission("reconciliation.handle")
  runReconciliation(
    @Req() request: any,
    @Body() body: { type?: string; bizDate?: string; scenario?: string; remark?: string; confirm?: boolean } = {},
  ) {
    const result = this.reconciliations.run(body);
    this.log(request, "reconciliation.run", "reconciliation", result.reconcileNo, {
      type: result.type,
      bizDate: body.bizDate ?? new Date().toISOString().slice(0, 10),
      mockDifferenceSupported: true,
      remark: body.remark,
      scenario: body.scenario ?? result.scenario,
      abnormalCount: result.abnormalCount,
    });
    return ok(result);
  }

  @Get("ranking/config")
  @RequirePermission("ranking.read")
  rankingConfig() {
    return ok(this.rankings.getConfig());
  }

  @Post("ranking/config")
  @RequirePermission("ranking.write")
  saveRankingConfig(@Req() request: any, @Body() body: Partial<RankingConfigEntity>) {
    const config = this.rankings.saveConfig(body);
    this.log(request, "ranking.config.save", "ranking_config", "global", {
      enabled: config.enabled,
      enabledTypes: config.enabledTypes,
      amountDisplayMode: config.amountDisplayMode,
      hideRiskStores: config.hideRiskStores,
      visibleScope: config.visibleScope,
    });
    return ok({ saved: true, config });
  }

  @Get("risk/events")
  @RequirePermission("risk.read")
  riskEvents(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("status") status?: string,
    @Query("riskType") riskType?: string,
    @Query("level") level?: string,
    @Query("merchantId") merchantId?: string,
    @Query("storeId") storeId?: string,
    @Query("openid") openid?: string,
  ) {
    const list = this.risks.list({
      status,
      riskType,
      level,
      merchantId: merchantId ? Number(merchantId) : undefined,
      storeId: storeId ? Number(storeId) : undefined,
      openid,
    });
    return ok({ ...emptyPage(Number(page), Number(pageSize)), list, total: list.length });
  }

  @Post("risk/events/:id/handle")
  @RequirePermission("risk.handle")
  handleRisk(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: { action?: string; remark?: string; confirm?: boolean },
  ) {
    const result = this.risks.handle(Number(id), body, request.adminRole);
    this.log(request, "risk.handle", "risk_event", id, {
      action: result.handledAction,
      status: result.status,
      remark: body.remark,
    });
    return ok(result);
  }

  @Get("system/config")
  @RequirePermission("system_config.read")
  systemConfig() {
    return ok(this.configCenter.list());
  }

  @Post("system/config")
  @RequirePermission("system_config.write")
  saveSystemConfig(
    @Req() request: any,
    @Body() body: { configs?: { key: string; value: unknown }[]; reason?: string; confirm?: boolean } = {},
  ) {
    const result = this.configCenter.save(body);
    this.log(request, "system.config.save", "system_config", "batch", {
      ...result,
      reason: body.reason,
      sensitiveMasked: true,
    });
    return ok(result);
  }

  @Get("integrations/status")
  @RequirePermission("system_config.read")
  integrationStatus() {
    return ok(this.configCenter.integrationsStatus());
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
  @RequirePermission("permission.write")
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

  private serializeStore(store: NonNullable<ReturnType<StoreRepository["findById"]>>) {
    const merchant = this.merchantsRepo.findById(store.merchantId);
    const wifi = this.findStoreWifiForAdmin(store.id);
    const qrcode = this.qrcodesRepo.findActiveByStoreId(store.id);
    return {
      ...store,
      merchantName: merchant?.name ?? null,
      wifiStatus: this.wifiStatusText(wifi),
      qrcodeStatus: qrcode ? "已生成" : "未生成",
    };
  }

  private findStoreWifiForAdmin(storeId: number) {
    const storeWifi = this.wifiRepo.list().filter((wifi) => wifi.storeId === storeId);
    return storeWifi.find((wifi) => wifi.isPrimary) ?? storeWifi[0];
  }

  private wifiStatusText(wifi: { isEnabled: boolean } | undefined) {
    if (!wifi) {
      return "未配置";
    }
    return wifi.isEnabled ? "已配置" : "已禁用";
  }

  private assertStoreInput(input: Partial<CreateStoreDto>, isCreate: boolean) {
    if (isCreate && !input.merchantId) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "所属商户必填", 400);
    }
    if (input.merchantId && !this.merchantsRepo.findById(Number(input.merchantId))) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "所属商户不存在", 404);
    }
    if (isCreate && !String(input.name ?? "").trim()) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "门店名称必填", 400);
    }
    if (input.shareRateBps !== undefined && input.shareRateBps !== null) {
      this.assertBps(input.shareRateBps);
    }
  }

  private normalizeWifiInput(input: SaveWifiConfigDto): SaveWifiConfigDto {
    const existing = input.id ? this.wifiRepo.findById(Number(input.id)) : undefined;
    if (input.id && !existing) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "WiFi 配置不存在", 404);
    }
    if (!this.storesRepo.findById(Number(input.storeId))) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    const ssid = String(input.ssid ?? "").trim();
    if (!ssid || ssid.length > 64) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "WiFi 名称必须为 1-64 字符", 400);
    }
    const securityType = input.securityType ?? "WPA2";
    if (!WIFI_SECURITY_TYPES.includes(securityType)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "WiFi 加密类型不合法", 400);
    }
    const connectMode = input.connectMode ?? "mock";
    if (!WIFI_CONNECT_MODES.includes(connectMode)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "WiFi 连接模式不合法", 400);
    }
    const passwordViewPolicy = input.passwordViewPolicy ?? "never_plain";
    if (!PASSWORD_VIEW_POLICIES.includes(passwordViewPolicy)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "密码查看策略不合法", 400);
    }
    if (!input.id && !input.password) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "新增 WiFi 必须填写密码，开发阶段请使用 mock 密码", 400);
    }
    return {
      ...input,
      ssid,
      securityType,
      connectMode,
      passwordViewPolicy,
      isPrimary: input.isPrimary ?? true,
      isEnabled: input.isEnabled ?? true,
      allowCopyPassword: input.allowCopyPassword ?? true,
      showManualFallback: input.showManualFallback ?? true,
    };
  }

  private assertShareRate(shareRateBps: number, reason: string, confirm: boolean) {
    if (!confirm || !reason || shareRateBps < 0 || shareRateBps > 10000) {
      throw new ApiException(ERROR_CODES.SHARE_RATE_INVALID, "分成比例不合法或未二次确认", 400);
    }
  }

  private assertBps(shareRateBps: number) {
    if (shareRateBps < 0 || shareRateBps > 10000) {
      throw new ApiException(ERROR_CODES.SHARE_RATE_INVALID, "分成比例不合法", 400);
    }
  }

  private assertConfirm(confirm: boolean | undefined, reason: string | undefined, message: string) {
    if (!confirm || !String(reason ?? "").trim()) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, message, 400);
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
