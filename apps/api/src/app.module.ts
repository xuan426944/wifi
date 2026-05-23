import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AdController } from "./ad/ad.controller";
import { AdService } from "./ad/ad.service";
import { AdminController } from "./admin/admin.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { APP_CONFIG, loadAppConfig } from "./config/app-config";
import { InMemoryStore } from "./database/in-memory-store";
import {
  MemoryMerchantRepository,
  MemoryQrcodeRepository,
  MemoryStoreRepository,
  MemoryUserRepository,
  MemoryWalletRepository,
  MemoryWifiConfigRepository,
} from "./database/memory-repositories";
import { MIGRATIONS_DIR, MigrationService } from "./database/migration.service";
import {
  MERCHANT_REPOSITORY,
  QRCODE_REPOSITORY,
  STORE_REPOSITORY,
  USER_REPOSITORY,
  WALLET_REPOSITORY,
  WIFI_CONFIG_REPOSITORY,
} from "./database/repositories";
import { MerchantApplicationController } from "./merchant/merchant-application.controller";
import { MerchantController } from "./merchant/merchant.controller";
import { RankingController } from "./merchant/ranking.controller";
import { OperationLogService } from "./operation-log/operation-log.service";
import { PaymentController } from "./payment/payment.controller";
import {
  AD_PROVIDER,
  AUTH_PROVIDER,
  NOTIFY_VERIFIER,
  TRANSFER_PROVIDER,
  WIFI_PROVIDER,
} from "./providers/provider.interfaces";
import {
  MockAdProvider,
  MockAuthProvider,
  MockNotifyVerifier,
  MockTransferProvider,
  MockWifiProvider,
} from "./providers/mock.providers";
import { AdminPermissionGuard } from "./rbac/admin-permission.guard";
import { AuthGuard } from "./rbac/auth.guard";
import { MerchantGuard } from "./rbac/merchant.guard";
import { StoreController } from "./store/store.controller";
import { WifiController } from "./wifi/wifi.controller";
import { WifiService } from "./wifi/wifi.service";
import { join } from "node:path";

@Module({
  controllers: [
    AuthController,
    StoreController,
    AdController,
    WifiController,
    MerchantController,
    MerchantApplicationController,
    RankingController,
    AdminController,
    PaymentController,
  ],
  providers: [
    InMemoryStore,
    AuthService,
    AdService,
    WifiService,
    MigrationService,
    OperationLogService,
    AdminPermissionGuard,
    MerchantGuard,
    { provide: APP_CONFIG, useFactory: () => loadAppConfig() },
    { provide: MIGRATIONS_DIR, useValue: join(__dirname, "database", "migrations") },
    { provide: USER_REPOSITORY, useClass: MemoryUserRepository },
    { provide: MERCHANT_REPOSITORY, useClass: MemoryMerchantRepository },
    { provide: STORE_REPOSITORY, useClass: MemoryStoreRepository },
    { provide: WIFI_CONFIG_REPOSITORY, useClass: MemoryWifiConfigRepository },
    { provide: QRCODE_REPOSITORY, useClass: MemoryQrcodeRepository },
    { provide: WALLET_REPOSITORY, useClass: MemoryWalletRepository },
    { provide: AUTH_PROVIDER, useClass: MockAuthProvider },
    { provide: AD_PROVIDER, useClass: MockAdProvider },
    { provide: WIFI_PROVIDER, useClass: MockWifiProvider },
    { provide: TRANSFER_PROVIDER, useClass: MockTransferProvider },
    { provide: NOTIFY_VERIFIER, useClass: MockNotifyVerifier },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
