import { Inject, Injectable } from "@nestjs/common";
import { ok } from "../common/api-response";
import { ApiException, ERROR_CODES } from "../common/errors";
import { APP_CONFIG, AppConfig } from "./app-config";

type ConfigType = "string" | "url" | "secret" | "enum" | "boolean" | "integer" | "decimal";
type ConfigSource = "env" | "admin_override" | "default";

export interface ConfigDefinition {
  key: string;
  name: string;
  type: ConfigType;
  module: string;
  defaultValue: string | number | boolean;
  editableInAdmin: boolean;
  sensitive: boolean;
  requiredForProduction: boolean;
  restartRequired: boolean;
  envKey?: string;
  options?: string[];
}

export interface ConfigSaveItem {
  key: string;
  value: unknown;
}

interface SerializedConfigItem {
  key: string;
  name: string;
  type: ConfigType;
  module: string;
  value: unknown;
  displayValue: string;
  default: unknown;
  editableInAdmin: boolean;
  sensitive: boolean;
  requiredForProduction: boolean;
  restartRequired: boolean;
  envKey?: string;
  options: string[];
  source: ConfigSource;
  configured: boolean;
  status: string;
  rawValue: unknown;
}

const CONFIG_DEFINITIONS: ConfigDefinition[] = [
  config("system.platform_name", "平台名称", "string", "system", "门店扫码 WiFi 广告平台", true, false, true),
  config("system.logo_url", "平台 Logo", "url", "system", "", true, false, false),
  config("system.customer_service_phone", "客服电话", "string", "system", "", true, false, false),
  config("agreement.user_agreement_url", "用户协议链接", "url", "compliance", "", true, false, true),
  config("agreement.privacy_policy_url", "隐私政策链接", "url", "compliance", "", true, false, true),
  config("agreement.merchant_agreement_url", "商户协议链接", "url", "compliance", "", true, false, true),
  config("app.auth_mode", "登录模式", "enum", "auth", "mock_wechat", false, false, true, "AUTH_MODE", [
    "mock_wechat",
    "wechat",
  ]),
  config("wechat.app_id", "微信小程序 AppID", "string", "wechat", "", false, true, true, "WECHAT_APP_ID"),
  config("wechat.app_secret", "微信小程序 AppSecret", "secret", "wechat", "", false, true, true, "WECHAT_APP_SECRET"),
  config("ad.mode", "广告模式", "enum", "ad", "mock", true, false, true, "AD_MODE", ["mock", "wechat", "self", "cpa", "cps"]),
  config("ad.wechat_reward_ad_unit_id", "微信激励广告位 ID", "string", "ad", "mock-reward-ad-unit", true, false, false),
  config("wifi.mode", "WiFi 连接模式", "enum", "wifi", "mock", true, false, true, "WIFI_MODE", ["mock", "wechat", "manual"]),
  config("wifi.require_ad_before_connect", "连接前必须看广告", "boolean", "wifi", true, true, false, false),
  config("wifi.reward_token_ttl_seconds", "reward_token 有效秒数", "integer", "wifi", 300, true, false, false),
  config("wifi.show_manual_fallback", "失败后显示手动连接", "boolean", "wifi", true, true, false, false),
  config("wifi.allow_copy_password", "允许复制密码", "boolean", "wifi", true, true, false, false),
  config("commission.default_merchant_share_rate_bps", "默认商户分成比例 bps", "integer", "commission", 5000, true, false, true),
  config("commission.allow_high_share_rate", "允许商户比例超过 80%", "boolean", "commission", false, true, false, false),
  config("withdraw.enabled", "是否开启提现", "boolean", "withdraw", true, true, false, false),
  config("withdraw.min_amount_cent", "最低提现金额分", "integer", "withdraw", 5000, true, false, false),
  config("withdraw.single_auto_limit_cent", "单笔自动提现上限分", "integer", "withdraw", 30000, true, false, false),
  config("withdraw.daily_auto_limit_cent", "单日自动提现上限分", "integer", "withdraw", 50000, true, false, false),
  config("withdraw.monthly_limit_cent", "单月提现上限分", "integer", "withdraw", 500000, true, false, false),
  config("withdraw.new_merchant_protection_days", "新商户保护期天数", "integer", "withdraw", 7, true, false, false),
  config("withdraw.min_effective_ad_complete_count", "提现最低有效广告完成量", "integer", "withdraw", 100, true, false, false),
  config("payment.mode", "支付模式", "enum", "payment", "mock", false, false, true, "PAYMENT_MODE", ["mock", "wechat"]),
  config("transfer.mode", "转账模式", "enum", "withdraw", "mock", false, false, true, "TRANSFER_MODE", ["mock", "wechat"]),
  config("storage.mode", "存储模式", "enum", "storage", "local", false, false, true, "STORAGE_MODE", ["local", "oss"]),
  config("notify.mode", "通知模式", "enum", "notify", "mock", false, false, true, "NOTIFY_MODE", ["mock", "wechat"]),
  config("wechat_pay.mch_id", "微信支付商户号", "string", "payment", "", false, true, true, "WECHAT_PAY_MCH_ID"),
  config("wechat_pay.api_v3_key", "微信支付 API v3 密钥", "secret", "payment", "", false, true, true, "WECHAT_PAY_API_V3_KEY"),
  config("ranking.enabled", "是否开启排行榜", "boolean", "ranking", true, true, false, false),
  config("ranking.amount_display_mode", "收益展示模式", "enum", "ranking", "range", true, false, false, undefined, [
    "exact",
    "range",
    "heat",
    "hidden",
  ]),
  config("ranking.refresh_minutes", "排行榜刷新分钟数", "integer", "ranking", 10, true, false, false),
  config("ranking.hide_risk_stores", "隐藏风控门店", "boolean", "ranking", true, true, false, false),
  config("risk.same_openid_same_store_daily_limit", "同 openid 同门店每日有效收益次数", "integer", "risk", 1, true, false, false),
  config("risk.same_openid_global_daily_limit", "同 openid 全平台每日有效收益次数", "integer", "risk", 3, true, false, false),
  config("risk.ip_ad_complete_threshold", "同 IP 广告完成阈值", "integer", "risk", 50, true, false, false),
  config("risk.connect_fail_rate_threshold", "连接失败率阈值", "decimal", "risk", 0.8, true, false, false),
  config("merchant_application.enabled", "商户自助申请开关", "boolean", "merchant_application", true, true, false, false),
  config("merchant_application.require_phone", "商户申请必须手机号", "boolean", "merchant_application", true, true, false, false),
  config("merchant_application.wifi_optional", "商户申请 WiFi 可选", "boolean", "merchant_application", true, true, false, false),
  config("merchant_application.auto_create_wifi", "审核通过后自动创建 WiFi", "boolean", "merchant_application", true, true, false, false),
  config("finance.reconciliation_enabled", "财务对账任务开关", "boolean", "finance", true, true, false, false),
];

@Injectable()
export class ConfigCenterService {
  private readonly overrides = new Map<string, unknown>();

  constructor(@Inject(APP_CONFIG) private readonly appConfig: AppConfig) {}

  list() {
    const configs = CONFIG_DEFINITIONS.map((definition) => this.serialize(definition));
    const missingProductionItems = configs
      .filter((item) => item.requiredForProduction && (!item.configured || this.isMockProductionMode(item.key, item.rawValue)))
      .map((item) => item.envKey ?? item.key);
    return {
      configs: configs.map(({ rawValue: _rawValue, ...safe }) => safe),
      modules: [...new Set(CONFIG_DEFINITIONS.map((definition) => definition.module))],
      mockAdapterModes: this.modeSummary(),
      productionReadiness: {
        readyForDevelopment: true,
        readyForProduction: missingProductionItems.length === 0,
        missingProductionItems,
        note: "开发阶段默认全部 Mock/Adapter，真实微信、广告、支付、WiFi、存储和通知配置上线前后置。",
      },
      sensitiveMasked: true,
    };
  }

  save(input: { configs?: ConfigSaveItem[]; reason?: string; confirm?: boolean }) {
    const configs = input.configs ?? [];
    if (configs.length === 0) {
      return { saved: true, updated: [], skipped: [], sensitiveMasked: true };
    }
    if (!input.confirm || !String(input.reason ?? "").trim()) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "保存系统配置必须填写原因并二次确认", 400);
    }

    const updated = configs.map((item) => {
      const definition = this.getDefinition(item.key);
      if (!definition.editableInAdmin) {
        throw new ApiException(ERROR_CODES.PARAM_INVALID, "该配置只能通过环境变量或部署配置修改", 400);
      }
      const before = this.serialize(definition);
      const normalized = this.normalizeValue(definition, item.value);
      this.overrides.set(definition.key, normalized);
      const after = this.serialize(definition);
      return {
        key: definition.key,
        before: before.value,
        after: after.value,
        source: after.source,
        restartRequired: definition.restartRequired,
      };
    });

    return {
      saved: true,
      updated,
      skipped: [],
      sensitiveMasked: true,
    };
  }

  integrationsStatus() {
    const configs = CONFIG_DEFINITIONS.map((definition) => this.serialize(definition));
    const sensitive = (key: string) => configs.find((item) => item.key === key);
    const missingProductionItems = configs
      .filter((item) => item.requiredForProduction && (!item.configured || this.isMockProductionMode(item.key, item.rawValue)))
      .map((item) => item.envKey ?? item.key);

    return {
      ...this.modeSummary(),
      mockAdapterActive: Object.values(this.modeSummary()).some((mode) => ["mock", "mock_wechat", "local"].includes(String(mode))),
      readyForDevelopment: true,
      readyForProduction: missingProductionItems.length === 0,
      missingProductionItems,
      items: [
        integration("wechatAppId", "微信 AppID", "wechat", sensitive("wechat.app_id")),
        integration("wechatAppSecret", "AppSecret", "wechat", sensitive("wechat.app_secret")),
        integration("rewardAdUnitId", "广告位", "ad", sensitive("ad.wechat_reward_ad_unit_id")),
        integration("wechatPayMchId", "支付商户号", "payment", sensitive("wechat_pay.mch_id")),
        integration("apiV3Key", "API v3", "payment", sensitive("wechat_pay.api_v3_key")),
        {
          key: "wifiMode",
          name: "WiFi Adapter",
          module: "wifi",
          status: this.modeSummary().wifiMode === "mock" ? "mock_adapter" : "configured",
          configured: true,
          displayValue: this.modeSummary().wifiMode,
          requiredForProduction: true,
          missingProductionItem: this.modeSummary().wifiMode === "mock" ? "WIFI_MODE=wechat|manual" : null,
        },
        {
          key: "storage",
          name: "对象存储",
          module: "storage",
          status: this.modeSummary().storageMode === "local" ? "local_adapter" : "configured",
          configured: true,
          displayValue: this.modeSummary().storageMode,
          requiredForProduction: true,
          missingProductionItem: this.modeSummary().storageMode === "local" ? "STORAGE_MODE=oss" : null,
        },
        {
          key: "notify",
          name: "通知回调",
          module: "notify",
          status: this.modeSummary().notifyMode === "mock" ? "mock_adapter" : "configured",
          configured: true,
          displayValue: this.modeSummary().notifyMode,
          requiredForProduction: true,
          missingProductionItem: this.modeSummary().notifyMode === "mock" ? "NOTIFY_MODE=wechat" : null,
        },
      ],
      note: "开发阶段不要求真实微信 AppID、广告位、商户号、API v3 密钥或真实 WiFi 信息。",
      sensitiveMasked: true,
    };
  }

  responseForList() {
    return ok(this.list());
  }

  private modeSummary() {
    return {
      authMode: this.configValue("app.auth_mode", this.appConfig.authMode),
      adMode: this.configValue("ad.mode", this.appConfig.adMode),
      wifiMode: this.configValue("wifi.mode", this.appConfig.wifiMode),
      paymentMode: this.configValue("payment.mode", this.appConfig.paymentMode),
      transferMode: this.configValue("transfer.mode", this.appConfig.transferMode),
      storageMode: this.configValue("storage.mode", this.appConfig.storageMode),
      notifyMode: this.configValue("notify.mode", this.appConfig.notifyMode),
    };
  }

  private serialize(definition: ConfigDefinition): SerializedConfigItem {
    const rawValue = this.configValue(definition.key, this.envOrDefault(definition));
    const configured = rawValue !== "" && rawValue !== undefined && rawValue !== null;
    return {
      key: definition.key,
      name: definition.name,
      type: definition.type,
      module: definition.module,
      value: definition.sensitive ? (configured ? "***" : "") : rawValue,
      displayValue: definition.sensitive ? (configured ? "已配置（已脱敏）" : "未配置") : String(rawValue),
      default: definition.sensitive ? (definition.defaultValue ? "***" : "") : definition.defaultValue,
      editableInAdmin: definition.editableInAdmin,
      sensitive: definition.sensitive,
      requiredForProduction: definition.requiredForProduction,
      restartRequired: definition.restartRequired,
      envKey: definition.envKey,
      options: definition.options ?? [],
      source: this.sourceFor(definition),
      configured,
      status: configured ? "configured" : definition.requiredForProduction ? "missing_for_production" : "optional",
      rawValue,
    };
  }

  private configValue(key: string, fallback: unknown) {
    return this.overrides.has(key) ? this.overrides.get(key) : fallback;
  }

  private envOrDefault(definition: ConfigDefinition) {
    if (!definition.envKey) {
      return definition.defaultValue;
    }
    const envValue = process.env[definition.envKey];
    if (envValue !== undefined && envValue !== "") {
      return this.normalizeValue(definition, envValue);
    }
    switch (definition.key) {
      case "app.auth_mode":
        return this.appConfig.authMode;
      case "ad.mode":
        return this.appConfig.adMode;
      case "wifi.mode":
        return this.appConfig.wifiMode;
      case "payment.mode":
        return this.appConfig.paymentMode;
      case "transfer.mode":
        return this.appConfig.transferMode;
      case "storage.mode":
        return this.appConfig.storageMode;
      case "notify.mode":
        return this.appConfig.notifyMode;
      default:
        return definition.defaultValue;
    }
  }

  private sourceFor(definition: ConfigDefinition): ConfigSource {
    if (this.overrides.has(definition.key)) {
      return "admin_override";
    }
    if (definition.envKey && process.env[definition.envKey]) {
      return "env";
    }
    return "default";
  }

  private getDefinition(key: string) {
    const definition = CONFIG_DEFINITIONS.find((item) => item.key === key);
    if (!definition) {
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "配置项不存在", 400);
    }
    return definition;
  }

  private normalizeValue(definition: ConfigDefinition, value: unknown) {
    if (definition.type === "boolean") {
      if (value === true || value === "true") {
        return true;
      }
      if (value === false || value === "false") {
        return false;
      }
      throw new ApiException(ERROR_CODES.PARAM_INVALID, "布尔配置值不合法", 400);
    }
    if (definition.type === "integer") {
      const numberValue = Number(value);
      if (!Number.isInteger(numberValue)) {
        throw new ApiException(ERROR_CODES.PARAM_INVALID, "整数配置值不合法", 400);
      }
      return numberValue;
    }
    if (definition.type === "decimal") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        throw new ApiException(ERROR_CODES.PARAM_INVALID, "数字配置值不合法", 400);
      }
      return numberValue;
    }
    if (definition.type === "enum") {
      const stringValue = String(value);
      if (!definition.options?.includes(stringValue)) {
        throw new ApiException(ERROR_CODES.PARAM_INVALID, "枚举配置值不合法", 400);
      }
      return stringValue;
    }
    return String(value ?? "");
  }

  private isMockProductionMode(key: string, value: unknown) {
    return (
      (key === "app.auth_mode" && value === "mock_wechat") ||
      (key === "ad.mode" && value === "mock") ||
      (key === "wifi.mode" && value === "mock") ||
      (key === "payment.mode" && value === "mock") ||
      (key === "transfer.mode" && value === "mock") ||
      (key === "storage.mode" && value === "local") ||
      (key === "notify.mode" && value === "mock")
    );
  }
}

function config(
  key: string,
  name: string,
  type: ConfigType,
  module: string,
  defaultValue: string | number | boolean,
  editableInAdmin: boolean,
  sensitive: boolean,
  requiredForProduction: boolean,
  envKey?: string,
  options?: string[],
): ConfigDefinition {
  return {
    key,
    name,
    type,
    module,
    defaultValue,
    editableInAdmin,
    sensitive,
    requiredForProduction,
    restartRequired: false,
    envKey,
    options,
  };
}

function integration(key: string, name: string, module: string, configItem: SerializedConfigItem | undefined) {
  const configured = Boolean(configItem?.configured);
  return {
    key,
    name,
    module,
    status: configured ? "configured" : configItem?.requiredForProduction ? "missing_for_production" : "optional",
    configured,
    displayValue: configItem?.displayValue ?? "未配置",
    requiredForProduction: Boolean(configItem?.requiredForProduction),
    missingProductionItem: configured ? null : (configItem?.envKey ?? configItem?.key ?? key),
  };
}
