import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { RiskEventEntity, RiskHandleAction } from "../database/entities";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  STORE_REPOSITORY,
  StoreRepository,
} from "../database/repositories";

const pad = (value: number) => String(value).padStart(6, "0");
const CONNECT_FAIL_RATE_THRESHOLD = 0.8;
const CONNECT_FAIL_SAMPLE_MIN = 3;
const HANDLE_ACTIONS: RiskHandleAction[] = [
  "ignore",
  "freeze_revenue",
  "pause_withdraw",
  "disable_store",
  "disable_merchant",
  "recover",
  "remark",
];
const HIGH_RISK_ACTIONS: RiskHandleAction[] = [
  "freeze_revenue",
  "pause_withdraw",
  "disable_store",
  "disable_merchant",
  "recover",
];

@Injectable()
export class RiskService {
  constructor(
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
  ) {}

  list(input: { status?: string; riskType?: string; level?: string; merchantId?: number; storeId?: number; openid?: string } = {}) {
    this.scanConnectFailureRisk();
    return this.memoryStore.riskEvents
      .filter((event) => (input.status ? event.status === input.status : true))
      .filter((event) => (input.riskType ? event.riskType === input.riskType : true))
      .filter((event) => (input.level ? event.level === input.level : true))
      .filter((event) => (input.merchantId ? event.merchantId === input.merchantId : true))
      .filter((event) => (input.storeId ? event.storeId === input.storeId : true))
      .filter((event) => (input.openid ? event.openid === input.openid : true))
      .map((event) => this.serialize(event))
      .reverse();
  }

  handle(
    id: number,
    input: { action?: string; remark?: string; confirm?: boolean },
    actorRole?: string,
  ) {
    const event = this.memoryStore.riskEvents.find((item) => item.id === id);
    if (!event) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "风控事件不存在", HttpStatus.NOT_FOUND);
    }
    const action = this.assertAction(input.action ?? "remark");
    if (HIGH_RISK_ACTIONS.includes(action) && (!input.confirm || !String(input.remark ?? "").trim())) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "高危风控处理必须填写原因并二次确认", HttpStatus.BAD_REQUEST);
    }

    this.applyAction(event, action);
    event.handledBy = actorRole ?? "unknown";
    event.handledAction = action;
    event.handleRemark = input.remark;
    event.updatedAt = new Date().toISOString();
    if (action === "ignore") {
      event.status = "ignored";
      event.handledAt = event.updatedAt;
    } else if (action !== "remark") {
      event.status = "handled";
      event.handledAt = event.updatedAt;
    }
    return this.serialize(event);
  }

  scanConnectFailureRisk() {
    for (const store of this.stores.list()) {
      const logs = this.memoryStore.wifiConnectLogs.filter((log) => log.storeId === store.id);
      const total = logs.length;
      if (total < CONNECT_FAIL_SAMPLE_MIN) {
        continue;
      }
      const failed = logs.filter((log) => ["failed", "manual", "missing_wifi"].includes(log.status)).length;
      const failRate = failed / total;
      if (failRate < CONNECT_FAIL_RATE_THRESHOLD) {
        continue;
      }
      const merchant = this.merchants.findById(store.merchantId);
      const existing = this.memoryStore.riskEvents.find(
        (event) => event.riskType === "connect_fail_rate_high" && event.storeId === store.id && event.status === "open",
      );
      const description = `门店连接失败率 ${(failRate * 100).toFixed(0)}%，达到风控阈值`;
      const evidence = {
        total,
        failed,
        failRate: Number(failRate.toFixed(4)),
        threshold: CONNECT_FAIL_RATE_THRESHOLD,
        sampleMin: CONNECT_FAIL_SAMPLE_MIN,
      };
      if (existing) {
        existing.level = failRate >= 0.95 ? "critical" : "high";
        existing.description = description;
        existing.evidence = evidence;
        existing.updatedAt = new Date().toISOString();
        continue;
      }
      const id = this.memoryStore.nextRiskEventId();
      this.memoryStore.riskEvents.push({
        id,
        eventNo: `K20260523${pad(id)}`,
        riskType: "connect_fail_rate_high",
        level: failRate >= 0.95 ? "critical" : "high",
        status: "open",
        merchantId: merchant?.id,
        storeId: store.id,
        description,
        evidence,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private applyAction(event: RiskEventEntity, action: RiskHandleAction) {
    const merchant = event.merchantId ? this.merchants.findById(event.merchantId) : undefined;
    if ((action === "freeze_revenue" || action === "pause_withdraw") && merchant) {
      merchant.riskStatus = "frozen";
      merchant.status = "risk_frozen";
    }
    if (action === "disable_store" && event.storeId) {
      this.stores.setStatus(event.storeId, "disabled");
    }
    if (action === "disable_merchant" && merchant) {
      merchant.status = "disabled";
      merchant.riskStatus = "blocked";
    }
    if (action === "recover") {
      if (merchant) {
        merchant.riskStatus = "normal";
        if (merchant.status === "risk_frozen") {
          merchant.status = "active";
        }
      }
      if (event.storeId) {
        const store = this.stores.findById(event.storeId);
        if (store?.status === "disabled") {
          this.stores.setStatus(event.storeId, "active");
        }
      }
    }
  }

  private serialize(event: RiskEventEntity) {
    const merchant = event.merchantId ? this.merchants.findById(event.merchantId) : undefined;
    const store = event.storeId ? this.stores.findById(event.storeId) : undefined;
    return {
      ...event,
      merchantName: merchant?.name ?? null,
      storeName: store?.name ?? null,
      openidMasked: this.maskOpenid(event.openid),
      actionOptions: HANDLE_ACTIONS,
      highRiskActionNotice: "冻结、禁用、恢复类操作必须二次确认并写入操作日志",
    };
  }

  private assertAction(action: string) {
    if (!HANDLE_ACTIONS.includes(action as RiskHandleAction)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "风控处理动作不合法", HttpStatus.BAD_REQUEST);
    }
    return action as RiskHandleAction;
  }

  private maskOpenid(openid?: string) {
    if (!openid) {
      return null;
    }
    if (openid.length <= 8) {
      return `${openid.slice(0, 2)}***`;
    }
    return `${openid.slice(0, 4)}****${openid.slice(-4)}`;
  }
}
