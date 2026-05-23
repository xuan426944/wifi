import { Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { ReconciliationScenario, ReconciliationSeverity, ReconciliationType } from "../database/entities";

const pad = (value: number) => String(value).padStart(6, "0");

const SCENARIOS: Record<
  ReconciliationScenario,
  {
    localStatus: string;
    remoteStatus: string;
    amountCent: number;
    localAmountCent: number;
    remoteAmountCent: number;
    result: "matched" | "different" | "abnormal";
    severity: ReconciliationSeverity;
    requiresManualReview: boolean;
    detail: string;
  }
> = {
  matched: {
    localStatus: "paid",
    remoteStatus: "paid",
    amountCent: 5000,
    localAmountCent: 5000,
    remoteAmountCent: 5000,
    result: "matched",
    severity: "info",
    requiresManualReview: false,
    detail: "本地记录与 mock 远端账单一致",
  },
  local_paid_remote_failed: {
    localStatus: "paid",
    remoteStatus: "failed",
    amountCent: 5000,
    localAmountCent: 5000,
    remoteAmountCent: 0,
    result: "abnormal",
    severity: "critical",
    requiresManualReview: true,
    detail: "本地已成功但 mock 远端失败，必须人工复核",
  },
  local_processing_remote_paid: {
    localStatus: "transfer_processing",
    remoteStatus: "paid",
    amountCent: 5000,
    localAmountCent: 0,
    remoteAmountCent: 5000,
    result: "different",
    severity: "warning",
    requiresManualReview: true,
    detail: "本地处理中但 mock 远端已成功，需要补记 paid",
  },
  local_failed_remote_paid: {
    localStatus: "failed",
    remoteStatus: "paid",
    amountCent: 5000,
    localAmountCent: 0,
    remoteAmountCent: 5000,
    result: "abnormal",
    severity: "critical",
    requiresManualReview: true,
    detail: "本地失败但 mock 远端成功，高危异常",
  },
  amount_mismatch: {
    localStatus: "paid",
    remoteStatus: "paid",
    amountCent: 5000,
    localAmountCent: 5000,
    remoteAmountCent: 4900,
    result: "abnormal",
    severity: "critical",
    requiresManualReview: true,
    detail: "本地金额与 mock 远端金额不一致",
  },
  missing_remote: {
    localStatus: "transfer_processing",
    remoteStatus: "not_found",
    amountCent: 5000,
    localAmountCent: 5000,
    remoteAmountCent: 0,
    result: "different",
    severity: "high",
    requiresManualReview: true,
    detail: "mock 远端无记录，需要人工复核",
  },
  duplicate_callback: {
    localStatus: "paid",
    remoteStatus: "duplicate_paid_callback",
    amountCent: 5000,
    localAmountCent: 5000,
    remoteAmountCent: 5000,
    result: "different",
    severity: "high",
    requiresManualReview: true,
    detail: "mock 重复回调必须按幂等规则处理",
  },
};

const MOCK_DIFFERENCE_TYPES = [
  "matched",
  "local_paid_remote_failed",
  "local_processing_remote_paid",
  "local_failed_remote_paid",
  "amount_mismatch",
  "missing_remote",
  "duplicate_callback",
] as const;

@Injectable()
export class ReconciliationService {
  constructor(@Inject(InMemoryStore) private readonly store: InMemoryStore) {}

  list(input: { page?: number; pageSize?: number } = {}) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const list = [...this.store.reconciliationLogs].reverse();
    return {
      list,
      total: list.length,
      page,
      pageSize,
      tabs: ["withdraw", "wallet_ledger", "revenue_settlement", "differences"],
      mockDifferenceSupported: true,
      mockDifferenceTypes: MOCK_DIFFERENCE_TYPES,
      emptyText: "暂无对账记录",
    };
  }

  run(input: { type?: string; bizDate?: string; scenario?: string; remark?: string } = {}) {
    const type = this.normalizeType(input.type);
    const bizDate = input.bizDate ?? new Date().toISOString().slice(0, 10);
    const scenarios =
      input.scenario === "all_mock_differences"
        ? MOCK_DIFFERENCE_TYPES
        : [this.normalizeScenario(input.scenario ?? "matched")];
    const records = scenarios.map((scenario) => this.createRecord(type, bizDate, scenario, input.remark));
    const abnormalCount = records.filter((record) => record.result === "abnormal").length;
    const differentCount = records.filter((record) => record.result === "different").length;
    const matchedCount = records.filter((record) => record.result === "matched").length;
    const first = records[0];

    return {
      reconcileNo: first.reconcileNo,
      batchNo: first.reconcileNo,
      type,
      bizDate,
      status: "mock_completed",
      scenario: input.scenario ?? first.scenario,
      localAmountCent: first.localAmountCent,
      remoteAmountCent: first.remoteAmountCent,
      diffAmountCent: first.diffAmountCent,
      matchedCount,
      differentCount,
      abnormalCount,
      mockDifferenceSupported: true,
      mockDifferenceTypes: MOCK_DIFFERENCE_TYPES,
      records,
    };
  }

  private createRecord(type: ReconciliationType, bizDate: string, scenario: ReconciliationScenario, remark?: string) {
    const template = SCENARIOS[scenario];
    const id = this.store.nextReconciliationId();
    const now = new Date().toISOString();
    const record = {
      id,
      reconcileNo: `RC20260523${pad(id)}`,
      type,
      bizDate,
      scenario,
      localStatus: template.localStatus,
      remoteStatus: template.remoteStatus,
      amountCent: template.amountCent,
      localAmountCent: template.localAmountCent,
      remoteAmountCent: template.remoteAmountCent,
      diffAmountCent: template.localAmountCent - template.remoteAmountCent,
      result: template.result,
      status: template.requiresManualReview ? ("pending_manual_review" as const) : ("mock_completed" as const),
      severity: template.severity,
      requiresManualReview: template.requiresManualReview,
      detail: remark ? `${template.detail}；备注：${remark}` : template.detail,
      createdAt: now,
    };
    this.store.reconciliationLogs.push(record);
    return record;
  }

  private normalizeType(type = "withdraw"): ReconciliationType {
    if (type === "withdraw" || type === "wallet_ledger" || type === "revenue_settlement") {
      return type;
    }
    throw new ApiException(ERROR_CODES.PARAM_INVALID, "对账类型不合法", 400);
  }

  private normalizeScenario(scenario: string): ReconciliationScenario {
    if ((MOCK_DIFFERENCE_TYPES as readonly string[]).includes(scenario)) {
      return scenario as ReconciliationScenario;
    }
    throw new ApiException(ERROR_CODES.PARAM_INVALID, "mock 对账场景不合法", 400);
  }
}
