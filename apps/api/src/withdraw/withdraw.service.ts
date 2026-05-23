import { Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { MerchantWalletEntity, WalletLedgerType, WithdrawRecordEntity } from "../database/entities";
import { MERCHANT_REPOSITORY, MerchantRepository } from "../database/repositories";
import { TRANSFER_PROVIDER, TransferProvider } from "../providers/provider.interfaces";

const pad = (value: number) => String(value).padStart(6, "0");
const MIN_WITHDRAW_AMOUNT_CENT = 5000;

@Injectable()
export class WithdrawService {
  constructor(
    @Inject(InMemoryStore) private readonly memoryStore: InMemoryStore,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
    @Inject(TRANSFER_PROVIDER) private readonly transferProvider: TransferProvider,
  ) {}

  apply(input: { merchantId: number; openid: string; amountCent: number }) {
    const merchant = this.merchants.findById(input.merchantId);
    if (!merchant || merchant.status !== "active") {
      throw new ApiException(ERROR_CODES.MERCHANT_PERMISSION_REQUIRED, "异常商户不能提现", 403);
    }
    if (merchant.riskStatus !== "normal") {
      throw new ApiException(ERROR_CODES.MERCHANT_RISK_FROZEN, "商户风控状态不能提现", 400);
    }
    if (!Number.isInteger(input.amountCent) || input.amountCent < MIN_WITHDRAW_AMOUNT_CENT) {
      throw new ApiException(ERROR_CODES.WITHDRAW_BELOW_MIN_AMOUNT, "提现金额未达最低提现门槛", 400);
    }
    const wallet = this.getWallet(input.merchantId);
    if (wallet.availableCent < input.amountCent) {
      throw new ApiException(ERROR_CODES.BALANCE_NOT_ENOUGH, "可提现余额不足", 400);
    }
    const id = this.memoryStore.nextWithdrawId();
    const now = new Date().toISOString();
    const withdraw: WithdrawRecordEntity = {
      id,
      withdrawNo: `W20260523${pad(id)}`,
      merchantId: input.merchantId,
      openid: input.openid,
      amountCent: input.amountCent,
      status: "created",
      appliedAt: now,
      updatedAt: now,
    };
    this.memoryStore.withdrawRecords.push(withdraw);
    this.writeLedger({
      merchantId: input.merchantId,
      ledgerType: "withdraw_freeze",
      amountCent: input.amountCent,
      refType: "withdraw_record",
      refId: withdraw.id,
      idempotencyKey: `withdraw_freeze:${withdraw.id}`,
      remark: "withdraw apply freeze",
      apply(wallet) {
        wallet.availableCent -= input.amountCent;
        wallet.frozenWithdrawCent += input.amountCent;
      },
    });
    withdraw.status = "frozen";
    withdraw.frozenAt = new Date().toISOString();
    withdraw.updatedAt = withdraw.frozenAt;
    return this.serialize(withdraw);
  }

  list(input: { merchantId?: number; status?: string } = {}) {
    return this.memoryStore.withdrawRecords
      .filter((record) => (input.merchantId ? record.merchantId === input.merchantId : true))
      .filter((record) => (input.status ? record.status === input.status : true))
      .map((record) => this.serialize(record))
      .reverse();
  }

  review(id: number, reason?: string) {
    const withdraw = this.getWithdraw(id);
    if (!["frozen", "reviewing"].includes(withdraw.status)) {
      throw new ApiException(ERROR_CODES.WITHDRAW_STATUS_INVALID, "提现单状态不可进入审核", 400);
    }
    withdraw.status = "reviewing";
    withdraw.reviewReason = reason;
    withdraw.updatedAt = new Date().toISOString();
    return this.serialize(withdraw);
  }

  async approve(id: number, reason?: string) {
    const withdraw = this.getWithdraw(id);
    if (!["frozen", "reviewing"].includes(withdraw.status)) {
      throw new ApiException(ERROR_CODES.WITHDRAW_STATUS_INVALID, "提现单状态不可发起转账", 400);
    }
    if (this.getWallet(withdraw.merchantId).frozenWithdrawCent < withdraw.amountCent) {
      throw new ApiException(ERROR_CODES.WITHDRAW_STATUS_INVALID, "没有冻结不能发起打款", 400);
    }
    const result = await this.transferProvider.transfer({
      withdrawNo: withdraw.withdrawNo,
      openid: withdraw.openid,
      amountCent: withdraw.amountCent,
    });
    withdraw.status = "transfer_processing";
    withdraw.outBillNo = result.outBillNo;
    withdraw.reviewReason = reason;
    withdraw.updatedAt = new Date().toISOString();
    return this.serialize(withdraw);
  }

  reject(id: number, reason: string) {
    const withdraw = this.getWithdraw(id);
    if (!["frozen", "reviewing"].includes(withdraw.status)) {
      throw new ApiException(ERROR_CODES.WITHDRAW_STATUS_INVALID, "提现单状态不可拒绝", 400);
    }
    this.writeLedger({
      merchantId: withdraw.merchantId,
      ledgerType: "withdraw_failed_unfreeze",
      amountCent: withdraw.amountCent,
      refType: "withdraw_record",
      refId: withdraw.id,
      idempotencyKey: `withdraw_reject_unfreeze:${withdraw.id}`,
      remark: reason,
      apply(wallet) {
        wallet.frozenWithdrawCent -= withdraw.amountCent;
        wallet.availableCent += withdraw.amountCent;
      },
    });
    withdraw.status = "rejected";
    withdraw.failReason = reason;
    withdraw.updatedAt = new Date().toISOString();
    return this.serialize(withdraw);
  }

  async queryTransfer(id: number) {
    const withdraw = this.getWithdraw(id);
    if (withdraw.status !== "transfer_processing" || !withdraw.outBillNo) {
      throw new ApiException(ERROR_CODES.WITHDRAW_STATUS_INVALID, "提现单未处于转账处理中", 400);
    }
    const remote = await this.transferProvider.query(withdraw.outBillNo);
    if (remote.status === "paid") {
      this.writeLedger({
        merchantId: withdraw.merchantId,
        ledgerType: "withdraw_paid",
        amountCent: withdraw.amountCent,
        refType: "withdraw_record",
        refId: withdraw.id,
        idempotencyKey: `withdraw_paid:${withdraw.id}`,
        remark: "mock transfer paid confirmed",
        apply(wallet) {
          wallet.frozenWithdrawCent -= withdraw.amountCent;
          wallet.totalWithdrawnCent += withdraw.amountCent;
        },
      });
      withdraw.status = "paid";
      withdraw.wechatBillNo = remote.remoteBillNo;
      withdraw.paidAt = new Date().toISOString();
      withdraw.updatedAt = withdraw.paidAt;
    }
    if (remote.status === "failed") {
      this.writeLedger({
        merchantId: withdraw.merchantId,
        ledgerType: "withdraw_failed_unfreeze",
        amountCent: withdraw.amountCent,
        refType: "withdraw_record",
        refId: withdraw.id,
        idempotencyKey: `withdraw_failed_unfreeze:${withdraw.id}`,
        remark: "mock transfer failed",
        apply(wallet) {
          wallet.frozenWithdrawCent -= withdraw.amountCent;
          wallet.availableCent += withdraw.amountCent;
        },
      });
      withdraw.status = "failed";
      withdraw.failReason = "mock transfer failed";
      withdraw.updatedAt = new Date().toISOString();
    }
    return {
      ...this.serialize(withdraw),
      remoteStatus: remote.status,
      remoteBillNo: remote.remoteBillNo,
    };
  }

  serialize(withdraw: WithdrawRecordEntity) {
    const merchant = this.merchants.findById(withdraw.merchantId);
    return {
      ...withdraw,
      merchantName: merchant?.name ?? null,
      openidMasked: withdraw.openid.replace(/^(.{4}).*(.{4})$/, "$1****$2"),
      accountingNotice: "提现冻结、打款确认和失败解冻均必须写 wallet_ledger",
    };
  }

  private getWithdraw(id: number) {
    const withdraw = this.memoryStore.withdrawRecords.find((record) => record.id === id);
    if (!withdraw) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "提现单不存在", 404);
    }
    return withdraw;
  }

  private getWallet(merchantId: number) {
    const wallet = this.memoryStore.wallets.find((item) => item.merchantId === merchantId);
    if (!wallet) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "商户钱包不存在", 404);
    }
    return wallet;
  }

  private writeLedger(input: {
    merchantId: number;
    ledgerType: WalletLedgerType;
    amountCent: number;
    refType: string;
    refId: number;
    idempotencyKey: string;
    remark: string;
    apply(wallet: MerchantWalletEntity): void;
  }) {
    const existing = this.memoryStore.walletLedger.find((ledger) => ledger.idempotencyKey === input.idempotencyKey);
    if (existing) {
      return existing;
    }
    const wallet = this.getWallet(input.merchantId);
    input.apply(wallet);
    wallet.version += 1;
    wallet.updatedAt = new Date().toISOString();
    const id = this.memoryStore.nextLedgerId();
    const ledger = {
      id,
      ledgerNo: `L20260523${pad(id)}`,
      merchantId: input.merchantId,
      ledgerType: input.ledgerType,
      amountCent: input.amountCent,
      availableAfterCent: wallet.availableCent,
      frozenWithdrawAfterCent: wallet.frozenWithdrawCent,
      frozenRiskAfterCent: wallet.frozenRiskCent,
      refType: input.refType,
      refId: input.refId,
      idempotencyKey: input.idempotencyKey,
      remark: input.remark,
      createdAt: new Date().toISOString(),
    };
    this.memoryStore.walletLedger.push(ledger);
    return ledger;
  }
}
