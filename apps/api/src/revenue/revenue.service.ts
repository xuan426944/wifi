import { Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore, AdViewRecord } from "../database/in-memory-store";
import { MerchantEntity, RevenueRecordEntity, StoreEntity } from "../database/entities";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
} from "../database/repositories";

const pad = (value: number) => String(value).padStart(6, "0");
const MOCK_GROSS_AMOUNT_CENT = 100;
const DEFAULT_SHARE_RATE_BPS = 5000;

@Injectable()
export class RevenueService {
  constructor(
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
  ) {}

  createEstimatedFromAdView(view: AdViewRecord) {
    if (!view.isEffective) {
      return undefined;
    }
    const existing = this.memoryStore.revenueRecords.find((record) => record.viewNo === view.viewNo);
    if (existing) {
      return existing;
    }
    const store = this.stores.findById(view.storeId);
    if (!store) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "门店不存在", 404);
    }
    const merchant = this.merchants.findById(store.merchantId);
    if (!merchant || merchant.status !== "active") {
      throw new ApiException(ERROR_CODES.MERCHANT_PERMISSION_REQUIRED, "商户不可结算", 403);
    }
    const shareRule = this.resolveShareRule(store, merchant);
    const grossAmountCent = MOCK_GROSS_AMOUNT_CENT;
    const merchantAmountCent = Math.floor((grossAmountCent * shareRule.appliedShareRateBps) / 10000);
    const platformAmountCent = grossAmountCent - merchantAmountCent;
    const id = this.memoryStore.nextRevenueId();
    const record: RevenueRecordEntity = {
      id,
      revenueNo: `R20260523${pad(id)}`,
      merchantId: merchant.id,
      storeId: store.id,
      adViewLogId: view.id,
      viewNo: view.viewNo,
      grossAmountCent,
      merchantAmountCent,
      platformAmountCent,
      appliedShareRateBps: shareRule.appliedShareRateBps,
      shareRuleSource: shareRule.shareRuleSource,
      shareRuleRefId: shareRule.shareRuleRefId,
      status: "estimated",
      createdAt: new Date().toISOString(),
    };
    this.memoryStore.revenueRecords.push(record);
    return record;
  }

  list(input: { merchantId?: number; status?: string } = {}) {
    return this.memoryStore.revenueRecords
      .filter((record) => (input.merchantId ? record.merchantId === input.merchantId : true))
      .filter((record) => (input.status ? record.status === input.status : true))
      .map((record) => this.serialize(record))
      .reverse();
  }

  summary(merchantId: number) {
    const records = this.memoryStore.revenueRecords.filter((record) => record.merchantId === merchantId);
    const estimated = records
      .filter((record) => record.status === "estimated" || record.status === "pending_settlement")
      .reduce((sum, record) => sum + record.merchantAmountCent, 0);
    const confirmed = records
      .filter((record) => record.status === "confirmed" || record.status === "withdrawable")
      .reduce((sum, record) => sum + record.merchantAmountCent, 0);
    return {
      estimatedCent: estimated,
      confirmedCent: confirmed,
      totalRevenueCent: records.reduce((sum, record) => sum + record.merchantAmountCent, 0),
      grossRevenueCent: records.reduce((sum, record) => sum + record.grossAmountCent, 0),
      platformRevenueCent: records.reduce((sum, record) => sum + record.platformAmountCent, 0),
      recordCount: records.length,
      effectiveAdCount: records.length,
    };
  }

  confirmEstimated(input: { revenueNos?: string[]; operatorRole?: string; settlementBatchId?: number; remark?: string } = {}) {
    const target = this.memoryStore.revenueRecords.filter((record) => {
      const selected = input.revenueNos?.length ? input.revenueNos.includes(record.revenueNo) : true;
      return selected && (record.status === "estimated" || record.status === "pending_settlement");
    });
    const confirmed = target.map((record) => this.confirmOne(record, input));
    return {
      imported: confirmed.length,
      confirmed: confirmed.length,
      abnormal: 0,
      settlementBatchId: input.settlementBatchId ?? this.buildBatchId(),
      records: confirmed.map((record) => this.serialize(record)),
      walletLedgerRequired: true,
    };
  }

  serialize(record: RevenueRecordEntity) {
    const merchant = this.merchants.findById(record.merchantId);
    const store = this.stores.findById(record.storeId);
    return {
      ...record,
      merchantName: merchant?.name ?? null,
      storeName: store?.name ?? null,
      revenueEstimateNotice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
    };
  }

  private confirmOne(record: RevenueRecordEntity, input: { settlementBatchId?: number; remark?: string }) {
    const idempotencyKey = `revenue_confirm:${record.id}`;
    const existingLedger = this.memoryStore.walletLedger.find((ledger) => ledger.idempotencyKey === idempotencyKey);
    if (existingLedger) {
      return record;
    }
    const wallet = this.memoryStore.wallets.find((item) => item.merchantId === record.merchantId);
    if (!wallet) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "商户钱包不存在", 404);
    }
    wallet.totalConfirmedCent += record.merchantAmountCent;
    wallet.availableCent += record.merchantAmountCent;
    wallet.version += 1;
    wallet.updatedAt = new Date().toISOString();
    const ledgerId = this.memoryStore.nextLedgerId();
    this.memoryStore.walletLedger.push({
      id: ledgerId,
      ledgerNo: `L20260523${pad(ledgerId)}`,
      merchantId: record.merchantId,
      ledgerType: "revenue_confirm",
      amountCent: record.merchantAmountCent,
      availableAfterCent: wallet.availableCent,
      frozenWithdrawAfterCent: wallet.frozenWithdrawCent,
      frozenRiskAfterCent: wallet.frozenRiskCent,
      refType: "revenue_record",
      refId: record.id,
      idempotencyKey,
      remark: input.remark ?? "mock settlement confirm",
      createdAt: new Date().toISOString(),
    });
    record.status = "withdrawable";
    record.settlementBatchId = input.settlementBatchId ?? this.buildBatchId();
    record.confirmedAt = new Date().toISOString();
    return record;
  }

  private resolveShareRule(store: StoreEntity, merchant: MerchantEntity) {
    if (store.shareRateBps !== undefined) {
      return {
        appliedShareRateBps: store.shareRateBps,
        shareRuleSource: "store" as const,
        shareRuleRefId: store.id,
      };
    }
    if (merchant.shareRateBps !== undefined) {
      return {
        appliedShareRateBps: merchant.shareRateBps,
        shareRuleSource: "merchant" as const,
        shareRuleRefId: merchant.id,
      };
    }
    return {
      appliedShareRateBps: DEFAULT_SHARE_RATE_BPS,
      shareRuleSource: "global" as const,
      shareRuleRefId: undefined,
    };
  }

  private buildBatchId() {
    return Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  }
}
