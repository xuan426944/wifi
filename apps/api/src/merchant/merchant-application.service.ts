import { Inject, Injectable } from "@nestjs/common";
import { ApiException, ERROR_CODES } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { ApproveMerchantApplicationDto, RejectMerchantApplicationDto, SubmitMerchantApplicationDto } from "../database/dtos";
import { MerchantApplicationEntity } from "../database/entities";
import {
  MERCHANT_REPOSITORY,
  MerchantRepository,
  QRCODE_REPOSITORY,
  QrcodeRepository,
  STORE_REPOSITORY,
  StoreRepository,
  USER_REPOSITORY,
  UserRepository,
  WIFI_CONFIG_REPOSITORY,
  WifiConfigRepository,
} from "../database/repositories";

const pad = (value: number) => String(value).padStart(6, "0");
const maskPhone = (phone: string) => phone.replace(/(\d{3})\d{4}(\d+)/, "$1****$2");
const maskPassword = (password?: string | null) =>
  password ? "*".repeat(Math.min(Math.max(password.length, 8), 12)) : undefined;
const cipherPassword = (password?: string | null) =>
  password ? `mock-cipher:${Buffer.from(password).toString("base64url")}` : undefined;

@Injectable()
export class MerchantApplicationService {
  constructor(
    @Inject(InMemoryStore) private readonly store: InMemoryStore,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MERCHANT_REPOSITORY) private readonly merchants: MerchantRepository,
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(WIFI_CONFIG_REPOSITORY) private readonly wifiConfigs: WifiConfigRepository,
    @Inject(QRCODE_REPOSITORY) private readonly qrcodes: QrcodeRepository,
  ) {}

  submit(openid: string, input: SubmitMerchantApplicationDto) {
    const activeOwner = this.merchants.findActiveOwner(openid);
    if (activeOwner?.merchant.status === "active") {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "当前微信已绑定 active 商户，请进入商家中心", 400);
    }
    this.assertSubmitInput(input);
    const existing = this.latestByOpenid(openid);
    if (existing && ["submitted", "reviewing"].includes(existing.status)) {
      return this.serialize(existing, { duplicateBlocked: true });
    }
    this.assertPhoneDailyLimit(input.applicantPhone);

    const user = this.users.findOrCreateByOpenid(openid);
    const id = this.store.nextMerchantApplicationId();
    const now = new Date().toISOString();
    const application: MerchantApplicationEntity = {
      id,
      applicationNo: `MA20260523${pad(id)}`,
      userId: user.id,
      openid,
      sourceStoreId: input.sourceStoreId ?? undefined,
      merchantName: String(input.merchantName || input.storeName).trim(),
      applicantName: input.applicantName.trim(),
      applicantPhone: input.applicantPhone.trim(),
      storeName: input.storeName.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || undefined,
      address: input.address.trim(),
      industry: input.industry.trim(),
      wifiSsid: input.wifiSsid?.trim() || undefined,
      wifiPasswordCipher: cipherPassword(input.wifiPassword),
      wifiPasswordMasked: maskPassword(input.wifiPassword),
      remark: input.remark?.trim() || undefined,
      status: "submitted",
      allowResubmit: true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.merchantApplications.push(application);
    this.log(application, "submit", "user", openid, undefined, { status: application.status });
    return this.serialize(application);
  }

  latest(openid: string, canViewMerchantPages: boolean) {
    const latest = this.latestByOpenid(openid);
    return {
      openid,
      hasActiveMerchant: canViewMerchantPages,
      latestApplicationStatus: latest?.status ?? null,
      latestApplication: latest ? this.serialize(latest) : null,
      entryAction: canViewMerchantPages ? "merchant_center" : latest ? "application_status" : "merchant_apply",
      wifiOptional: true,
      manualPhoneSupported: true,
    };
  }

  cancel(openid: string, applicationNo: string) {
    const application = this.getByNo(applicationNo);
    if (application.openid !== openid) {
      throw new ApiException(ERROR_CODES.MERCHANT_PERMISSION_REQUIRED, "只能取消自己的商户申请", 403);
    }
    if (!["draft", "submitted", "reviewing"].includes(application.status)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "当前申请状态不可取消", 400);
    }
    const before = { status: application.status };
    application.status = "canceled";
    application.updatedAt = new Date().toISOString();
    this.log(application, "cancel", "user", openid, before, { status: application.status });
    return this.serialize(application);
  }

  list(input: { status?: string; keyword?: string } = {}) {
    const keyword = input.keyword?.trim().toLowerCase();
    return this.store.merchantApplications
      .filter((application) => (input.status ? application.status === input.status : true))
      .filter((application) =>
        keyword
          ? [application.applicationNo, application.merchantName, application.storeName, application.applicantPhone, application.city]
              .join(" ")
              .toLowerCase()
              .includes(keyword)
          : true,
      )
      .map((application) => this.serialize(application))
      .reverse();
  }

  detail(applicationNo: string) {
    return this.serialize(this.getByNo(applicationNo), { includeSensitiveFlags: true });
  }

  approve(applicationNo: string, input: ApproveMerchantApplicationDto, reviewer: string) {
    this.assertConfirm(input.confirm, input.reviewRemark ?? input.reason, "审核通过必须填写原因并二次确认");
    const application = this.getByNo(applicationNo);
    if (!["submitted", "reviewing"].includes(application.status)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "当前申请状态不可审核通过", 400);
    }
    const before = { status: application.status };
    const createMerchant = input.createMerchant ?? true;
    const createStore = input.createStore ?? true;
    const bindOwner = input.bindOwner ?? true;
    const createWifiIfProvided = input.createWifiIfProvided ?? true;

    let merchantId = application.createdMerchantId;
    if (createMerchant && !merchantId) {
      const merchant = this.merchants.create({
        name: application.merchantName,
        ownerName: application.applicantName,
        ownerPhone: application.applicantPhone,
        city: application.city,
        industry: application.industry,
        shareRateBps: input.merchantShareRateBps ?? 5000,
      });
      merchant.status = "active";
      merchant.riskStatus = "normal";
      merchantId = merchant.id;
      application.createdMerchantId = merchant.id;
    }

    let storeId = application.createdStoreId;
    if (createStore && merchantId && !storeId) {
      const createdStore = this.stores.create({
        merchantId,
        name: application.storeName,
        city: application.city,
        district: application.district,
        address: application.address,
        industry: application.industry,
        contactName: application.applicantName,
        contactPhone: application.applicantPhone,
        shareRateBps: input.storeShareRateBps ?? undefined,
        status: "active",
      });
      storeId = createdStore.id;
      application.createdStoreId = createdStore.id;
      this.qrcodes.generate(createdStore.id);
    }

    let ownerBound = false;
    if (bindOwner && merchantId) {
      const user = this.users.findOrCreateByOpenid(application.openid);
      user.userType = "merchant_owner";
      const existingOwner = this.store.merchantOwners.find(
        (owner) => owner.openid === application.openid && owner.merchantId === merchantId,
      );
      if (!existingOwner) {
        this.store.merchantOwners.push({
          merchantId,
          userId: user.id,
          openid: application.openid,
          bindMethod: "admin",
          status: "active",
        });
      } else {
        existingOwner.status = "active";
      }
      ownerBound = true;
    }

    let wifiCreated = false;
    if (createWifiIfProvided && storeId && application.wifiSsid && application.wifiPasswordCipher) {
      const password = Buffer.from(application.wifiPasswordCipher.slice("mock-cipher:".length), "base64url").toString("utf8");
      this.wifiConfigs.save({
        storeId,
        ssid: application.wifiSsid,
        password,
        securityType: "WPA2",
        connectMode: "mock",
        isPrimary: true,
        isEnabled: true,
        allowCopyPassword: true,
        showManualFallback: true,
        passwordViewPolicy: "never_plain",
        remark: "Phase 13 merchant application mock WiFi",
      });
      wifiCreated = true;
    }

    application.status = "approved";
    application.reviewedBy = reviewer;
    application.reviewedAt = new Date().toISOString();
    application.updatedAt = application.reviewedAt;
    this.log(application, "approve", "admin", reviewer, before, {
      status: application.status,
      merchantId,
      storeId,
      ownerBound,
      wifiCreated,
    });

    return {
      ...this.serialize(application),
      createdMerchantId: merchantId ?? null,
      createdStoreId: storeId ?? null,
      ownerBound,
      wifiCreated,
      qrcodeCreated: Boolean(storeId),
      mockAdapterMode: true,
    };
  }

  reject(applicationNo: string, input: RejectMerchantApplicationDto, reviewer: string) {
    const reason = input.rejectReason ?? input.reason;
    this.assertConfirm(input.confirm, reason, "驳回申请必须填写原因并二次确认");
    const application = this.getByNo(applicationNo);
    if (!["submitted", "reviewing"].includes(application.status)) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "当前申请状态不可驳回", 400);
    }
    const before = { status: application.status };
    application.status = "rejected";
    application.rejectReason = reason;
    application.allowResubmit = input.allowResubmit ?? true;
    application.reviewedBy = reviewer;
    application.reviewedAt = new Date().toISOString();
    application.updatedAt = application.reviewedAt;
    this.log(application, "reject", "admin", reviewer, before, {
      status: application.status,
      rejectReason: reason,
      allowResubmit: application.allowResubmit,
    });
    return this.serialize(application);
  }

  private assertSubmitInput(input: SubmitMerchantApplicationDto) {
    const required = [
      input.applicantName,
      input.applicantPhone,
      input.storeName,
      input.city,
      input.address,
      input.industry,
    ];
    if (required.some((value) => !String(value ?? "").trim()) || input.agreeMerchantTerms !== true) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "商户申请必填项不完整或未同意商户协议", 400);
    }
    if (!/^1\d{10}$/.test(input.applicantPhone.trim())) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "手机号格式不正确，开发阶段可使用 mock/manual 手机号", 400);
    }
  }

  private assertPhoneDailyLimit(phone: string) {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const count = this.store.merchantApplications.filter(
      (application) => application.applicantPhone === phone && new Date(application.createdAt).getTime() >= since,
    ).length;
    if (count >= 3) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "同手机号 24 小时内提交次数过多，请稍后再试", 400);
    }
  }

  private assertConfirm(confirm: boolean | undefined, reason: string | undefined, message: string) {
    if (!confirm || !String(reason ?? "").trim()) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, message, 400);
    }
  }

  private latestByOpenid(openid: string) {
    return this.store.merchantApplications
      .filter((application) => application.openid === openid)
      .sort((left, right) => right.id - left.id)[0];
  }

  private getByNo(applicationNo: string) {
    const application = this.store.merchantApplications.find((item) => item.applicationNo === applicationNo);
    if (!application) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "商户申请不存在", 404);
    }
    return application;
  }

  private log(
    application: MerchantApplicationEntity,
    action: string,
    actorType: "user" | "admin" | "system",
    actorId: string,
    before: Record<string, unknown> | undefined,
    after: Record<string, unknown>,
  ) {
    this.store.merchantApplicationLogs.push({
      id: this.store.nextMerchantApplicationLogId(),
      applicationId: application.id,
      applicationNo: application.applicationNo,
      action,
      actorType,
      actorId,
      before,
      after,
      createdAt: new Date().toISOString(),
    });
  }

  private serialize(
    application: MerchantApplicationEntity,
    extra: { duplicateBlocked?: boolean; includeSensitiveFlags?: boolean } = {},
  ) {
    return {
      id: application.id,
      applicationNo: application.applicationNo,
      openid: application.openid,
      sourceStoreId: application.sourceStoreId ?? null,
      merchantName: application.merchantName,
      applicantName: application.applicantName,
      applicantPhoneMasked: maskPhone(application.applicantPhone),
      storeName: application.storeName,
      city: application.city,
      district: application.district ?? null,
      address: application.address,
      industry: application.industry,
      wifiSsid: application.wifiSsid ?? null,
      wifiProvided: Boolean(application.wifiSsid && application.wifiPasswordCipher),
      wifiPasswordMasked: application.wifiPasswordMasked ?? null,
      remark: application.remark ?? null,
      status: application.status,
      rejectReason: application.rejectReason ?? null,
      allowResubmit: application.allowResubmit,
      createdMerchantId: application.createdMerchantId ?? null,
      createdStoreId: application.createdStoreId ?? null,
      reviewedBy: application.reviewedBy ?? null,
      reviewedAt: application.reviewedAt ?? null,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      duplicateBlocked: extra.duplicateBlocked ?? false,
      sensitiveMasked: true,
      manualPhoneSupported: true,
      mockAdapterMode: true,
      includeSensitiveFlags: extra.includeSensitiveFlags ?? false,
    };
  }
}
