import { Injectable } from "@nestjs/common";
import {
  AdProvider,
  AuthProvider,
  NotifyVerifier,
  TransferProvider,
  WifiProvider,
} from "./provider.interfaces";

const nowCode = () => Date.now().toString(36);

@Injectable()
export class MockAuthProvider implements AuthProvider {
  async code2Session(code: string, mockOpenid?: string) {
    return {
      openid: mockOpenid || `mock_openid_${code || "customer"}`,
      unionid: "mock_unionid",
    };
  }
}

@Injectable()
export class MockAdProvider implements AdProvider {
  async startView(input: { openid: string; storeId: number }) {
    return {
      viewNo: `VIEW${nowCode()}`,
      adMode: "mock",
      adUnitId: "mock-reward-ad-unit",
      mockAdPayload: {
        title: "Mock 激励广告",
        durationSeconds: 3,
        storeId: input.storeId,
        openid: input.openid,
      },
    };
  }

  async verifyComplete(input: { viewNo: string; isEnded: boolean }) {
    return input.isEnded
      ? { isEffective: true }
      : { isEffective: false, invalidReason: "AD_NOT_COMPLETED" };
  }
}

@Injectable()
export class MockWifiProvider implements WifiProvider {
  async getConnectInfo(input: Parameters<WifiProvider["getConnectInfo"]>[0]) {
    const configured = input.configuredWifi;
    return {
      ssid: configured?.ssid ?? "Mock-WiFi",
      password: configured?.password ?? "12345678",
      securityType: configured?.securityType ?? ("WPA2" as const),
      connectMode: configured?.connectMode ?? ("mock" as const),
      manualFallback: {
        allowCopyPassword: configured?.allowCopyPassword ?? true,
        steps: configured?.showManualFallback
          ? ["复制 WiFi 名称", "复制 WiFi 密码", "打开系统设置并手动连接", "返回首页"]
          : [],
      },
    };
  }
}

@Injectable()
export class MockTransferProvider implements TransferProvider {
  async transfer(input: { withdrawNo: string; openid: string; amountCent: number }) {
    return {
      outBillNo: `MOCK_OUT_${input.withdrawNo}`,
      status: "processing" as const,
    };
  }

  async query(outBillNo: string) {
    return {
      status: "paid" as const,
      remoteBillNo: `MOCK_REMOTE_${outBillNo}`,
    };
  }
}

@Injectable()
export class MockNotifyVerifier implements NotifyVerifier {
  async verify(input: { headers: Record<string, string | string[] | undefined>; rawBody: string }) {
    return input.headers["x-mock-signature"] === "mock-signature" && input.rawBody.length >= 0;
  }
}
