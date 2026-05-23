import { Injectable } from "@nestjs/common";

export interface OperationLogRecord {
  id: number;
  actorType: "admin" | "merchant" | "system";
  actorId?: string | number;
  action: string;
  targetType?: string;
  targetId?: string | number;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

@Injectable()
export class OperationLogService {
  private readonly logs: OperationLogRecord[] = [];

  record(input: Omit<OperationLogRecord, "id" | "createdAt">) {
    const record: OperationLogRecord = {
      id: this.logs.length + 1,
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.logs.push(record);
    return record;
  }

  list() {
    return [...this.logs].reverse();
  }

  clearForTest() {
    this.logs.length = 0;
  }
}
