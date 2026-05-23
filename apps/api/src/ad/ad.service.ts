import { Inject, Injectable } from "@nestjs/common";
import { ERROR_CODES, ApiException } from "../common/errors";
import { InMemoryStore } from "../database/in-memory-store";
import { AD_PROVIDER, AdProvider } from "../providers/provider.interfaces";

@Injectable()
export class AdService {
  constructor(
    @Inject(AD_PROVIDER) private readonly adProvider: AdProvider,
    @Inject(InMemoryStore) private readonly store: InMemoryStore,
  ) {}

  async start(openid: string, storeId: number) {
    const view = await this.adProvider.startView({ openid, storeId });
    this.store.adViews.set(view.viewNo, {
      viewNo: view.viewNo,
      openid,
      storeId,
      isEffective: false,
    });
    return view;
  }

  async finish(viewNo: string, isEnded: boolean) {
    const record = this.store.adViews.get(viewNo);
    if (!record) {
      throw new ApiException(ERROR_CODES.NOT_FOUND, "广告观看记录不存在", 404);
    }
    const result = await this.adProvider.verifyComplete({ viewNo, isEnded });
    record.isEffective = result.isEffective;
    return result;
  }
}
