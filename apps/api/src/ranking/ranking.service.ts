import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import {
  RankingAmountDisplayMode,
  RankingConfigEntity,
  RankingType,
  RankingVisibleScope,
  RevenueRecordEntity,
  StoreEntity,
} from "../database/entities";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
} from "../database/repositories";

const pad = (value: number) => String(value).padStart(6, "0");

const RANKING_TYPES: RankingType[] = [
  "today_revenue",
  "yesterday_revenue",
  "month_revenue",
  "total_revenue",
  "scan_count",
  "ad_complete_count",
  "connect_success_count",
  "city_revenue",
  "industry_revenue",
];
const DISPLAY_MODES: RankingAmountDisplayMode[] = ["exact", "range", "heat", "hidden"];
const VISIBLE_SCOPES: RankingVisibleScope[] = ["global", "city", "industry"];

interface RankingRow {
  store: StoreEntity;
  merchantId: number;
  merchantName: string | null;
  score: number;
  unit: "cent" | "count";
}

@Injectable()
export class RankingService {
  constructor(
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
  ) {}

  getConfig() {
    return {
      ...this.memoryStore.rankingConfig,
      availableTypes: RANKING_TYPES,
      displayModes: DISPLAY_MODES,
      visibleScopes: VISIBLE_SCOPES,
      configNotice: "排行榜金额展示按后台配置脱敏，预估收益不等于可提现收益",
    };
  }

  saveConfig(input: Partial<RankingConfigEntity> = {}) {
    const current = this.memoryStore.rankingConfig;
    const enabledTypes = Array.isArray(input.enabledTypes)
      ? input.enabledTypes.filter((type): type is RankingType => this.isRankingType(type))
      : current.enabledTypes;
    if (Array.isArray(input.enabledTypes) && enabledTypes.length === 0) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "至少选择一个榜单类型", HttpStatus.BAD_REQUEST);
    }
    const amountDisplayMode = input.amountDisplayMode ?? current.amountDisplayMode;
    const visibleScope = input.visibleScope ?? current.visibleScope;
    if (!DISPLAY_MODES.includes(amountDisplayMode) || !VISIBLE_SCOPES.includes(visibleScope)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "排行榜配置枚举值不合法", HttpStatus.BAD_REQUEST);
    }
    this.memoryStore.rankingConfig = {
      enabled: input.enabled ?? current.enabled,
      enabledTypes,
      limit: this.clamp(input.limit, current.limit, 1, 100),
      amountDisplayMode,
      refreshMinutes: this.clamp(input.refreshMinutes, current.refreshMinutes, 1, 1440),
      hideRiskStores: input.hideRiskStores ?? current.hideRiskStores,
      hideNewStores: input.hideNewStores ?? current.hideNewStores,
      newStoreDays: this.clamp(input.newStoreDays, current.newStoreDays, 0, 365),
      minRevenueCent: this.clamp(input.minRevenueCent, current.minRevenueCent, 0, 10_000_000_000),
      minScanCount: this.clamp(input.minScanCount, current.minScanCount, 0, 10_000_000),
      visibleScope,
      updatedAt: new Date().toISOString(),
    };
    return this.getConfig();
  }

  storeRanking(input: { type?: string; merchantId?: number }) {
    const type = this.assertRankingType(input.type ?? "today_revenue");
    const config = this.memoryStore.rankingConfig;
    if (!config.enabled || !config.enabledTypes.includes(type)) {
      return {
        type,
        displayMode: config.amountDisplayMode,
        list: [],
        total: 0,
        myRank: null,
        emptyState: true,
        disabledReason: "排行榜暂未开启",
      };
    }

    const rows = this.applyMerchantVisibleScope(this.collectRows(type, config), input.merchantId, config.visibleScope)
      .filter((row) => (row.unit === "cent" ? row.score >= config.minRevenueCent : row.score >= config.minScanCount))
      .sort((left, right) => right.score - left.score || left.store.id - right.store.id);
    const ranked = rows.slice(0, config.limit).map((row, index) => ({
      rank: index + 1,
      storeId: row.store.id,
      storeName: row.store.name,
      merchantId: row.merchantId,
      merchantName: row.merchantName,
      city: row.store.city ?? null,
      industry: row.store.industry ?? this.merchants.findById(row.merchantId)?.industry ?? null,
      valueDisplay: this.formatScore(row.score, row.unit, config.amountDisplayMode),
      scoreUnit: row.unit,
      displayMode: config.amountDisplayMode,
    }));
    this.saveSnapshot(type, ranked.length, config.amountDisplayMode);
    return {
      type,
      displayMode: config.amountDisplayMode,
      visibleScope: config.visibleScope,
      list: ranked,
      total: ranked.length,
      myRank: this.findMyRank(rows, input.merchantId),
      emptyState: ranked.length === 0,
      revenueEstimateNotice: "预估收益不等于可提现收益，以结算确认和风控审核后金额为准",
    };
  }

  private collectRows(type: RankingType, config: RankingConfigEntity): RankingRow[] {
    return this.stores
      .list()
      .filter((store) => this.canJoinRanking(store, config))
      .map((store) => {
        const merchant = this.merchants.findById(store.merchantId);
        const unit: "cent" | "count" = this.isRevenueType(type) ? "cent" : "count";
        return {
          store,
          merchantId: store.merchantId,
          merchantName: merchant?.name ?? null,
          score: unit === "cent" ? this.sumRevenue(store.id, type) : this.countMetric(store.id, type),
          unit,
        };
      })
      .filter((row) => row.score > 0);
  }

  private canJoinRanking(store: StoreEntity, config: RankingConfigEntity) {
    if (store.status !== "active") {
      return false;
    }
    const merchant = this.merchants.findById(store.merchantId);
    if (!merchant || merchant.status !== "active") {
      return false;
    }
    if (config.hideRiskStores && merchant.riskStatus !== "normal") {
      return false;
    }
    if (config.hideNewStores && store.createdAt) {
      const createdAt = new Date(store.createdAt).getTime();
      const ageMs = Date.now() - createdAt;
      if (Number.isFinite(createdAt) && ageMs < config.newStoreDays * 24 * 60 * 60 * 1000) {
        return false;
      }
    }
    return true;
  }

  private applyMerchantVisibleScope(rows: RankingRow[], merchantId: number | undefined, visibleScope: RankingVisibleScope) {
    if (!merchantId || visibleScope === "global") {
      return rows;
    }
    const merchantStores = this.stores.findByMerchantId(merchantId);
    if (visibleScope === "city") {
      const cities = new Set(merchantStores.map((store) => store.city).filter(Boolean));
      return rows.filter((row) => cities.size === 0 || cities.has(row.store.city));
    }
    const industries = new Set(
      merchantStores
        .map((store) => store.industry ?? this.merchants.findById(store.merchantId)?.industry)
        .filter(Boolean),
    );
    return rows.filter((row) => {
      const industry = row.store.industry ?? this.merchants.findById(row.merchantId)?.industry;
      return industries.size === 0 || industries.has(industry);
    });
  }

  private sumRevenue(storeId: number, type: RankingType) {
    return this.memoryStore.revenueRecords
      .filter((record) => record.storeId === storeId)
      .filter((record) => record.status !== "invalid" && record.status !== "frozen")
      .filter((record) => this.inPeriod(record, type))
      .reduce((sum, record) => sum + record.merchantAmountCent, 0);
  }

  private countMetric(storeId: number, type: RankingType) {
    if (type === "scan_count") {
      return this.memoryStore.scanLogs.filter((log) => log.storeId === storeId).length;
    }
    if (type === "ad_complete_count") {
      return [...this.memoryStore.adViews.values()].filter((view) => view.storeId === storeId && view.isEffective).length;
    }
    if (type === "connect_success_count") {
      return this.memoryStore.wifiConnectLogs.filter((log) => log.storeId === storeId && log.status === "success").length;
    }
    return 0;
  }

  private inPeriod(record: RevenueRecordEntity, type: RankingType) {
    if (type === "total_revenue" || type === "city_revenue" || type === "industry_revenue") {
      return true;
    }
    const createdAt = new Date(record.createdAt);
    const now = new Date();
    if (type === "today_revenue") {
      return createdAt.toDateString() === now.toDateString();
    }
    if (type === "yesterday_revenue") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return createdAt.toDateString() === yesterday.toDateString();
    }
    if (type === "month_revenue") {
      return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();
    }
    return true;
  }

  private formatScore(score: number, unit: "cent" | "count", mode: RankingAmountDisplayMode) {
    if (mode === "hidden") {
      return "已隐藏";
    }
    if (mode === "heat") {
      return `热度 ${this.heatLevel(score, unit)}/5`;
    }
    if (mode === "exact") {
      return unit === "cent" ? `${(score / 100).toFixed(2)}元` : String(score);
    }
    if (unit === "cent") {
      const yuan = Math.floor(score / 100);
      const lower = Math.floor(yuan / 50) * 50;
      return `${lower}-${lower + 49}元`;
    }
    const lower = Math.floor(score / 10) * 10;
    return `${lower}-${lower + 9}`;
  }

  private heatLevel(score: number, unit: "cent" | "count") {
    const thresholds = unit === "cent" ? [100, 1_000, 5_000, 10_000] : [1, 5, 10, 20];
    return thresholds.reduce((level, threshold) => (score >= threshold ? level + 1 : level), 1);
  }

  private findMyRank(rows: RankingRow[], merchantId?: number) {
    if (!merchantId) {
      return null;
    }
    const index = rows.findIndex((row) => row.merchantId === merchantId);
    return index >= 0 ? index + 1 : null;
  }

  private saveSnapshot(type: RankingType, itemCount: number, amountDisplayMode: RankingAmountDisplayMode) {
    const id = this.memoryStore.nextRankingSnapshotId();
    this.memoryStore.rankingSnapshots.push({
      id,
      snapshotNo: `RK20260523${pad(id)}`,
      type,
      generatedAt: new Date().toISOString(),
      itemCount,
      amountDisplayMode,
    });
  }

  private isRevenueType(type: RankingType) {
    return ["today_revenue", "yesterday_revenue", "month_revenue", "total_revenue", "city_revenue", "industry_revenue"].includes(
      type,
    );
  }

  private assertRankingType(type: string) {
    if (!this.isRankingType(type)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "排行榜类型不合法", HttpStatus.BAD_REQUEST);
    }
    return type;
  }

  private isRankingType(type: unknown): type is RankingType {
    return typeof type === "string" && RANKING_TYPES.includes(type as RankingType);
  }

  private clamp(value: number | undefined, fallback: number, min: number, max: number) {
    const numeric = Number(value ?? fallback);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }
    return Math.min(Math.max(Math.floor(numeric), min), max);
  }
}
