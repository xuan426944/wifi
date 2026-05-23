import { Body, Controller, Headers, Inject, Post } from "@nestjs/common";
import { ok } from "../common/api-response";
import { ApiException, ERROR_CODES } from "../common/errors";
import { NOTIFY_VERIFIER, NotifyVerifier } from "../providers/provider.interfaces";
import { PublicRoute } from "../rbac/decorators";

@Controller("payment/wechat")
export class PaymentController {
  constructor(@Inject(NOTIFY_VERIFIER) private readonly notifyVerifier: NotifyVerifier) {}

  @PublicRoute()
  @Post("transfer-notify")
  async transferNotify(@Headers() headers: Record<string, string | string[] | undefined>, @Body() body: unknown) {
    const verified = await this.notifyVerifier.verify({
      headers,
      rawBody: JSON.stringify(body ?? {}),
    });
    if (!verified) {
      throw new ApiException(ERROR_CODES.CALLBACK_VERIFY_FAILED, "回调验签失败", 400);
    }
    return ok({ verifyStatus: "mock", processStatus: "processed" });
  }
}
