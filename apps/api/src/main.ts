import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/http-exception.filter";
import { loadAppConfig } from "./config/app-config";

export async function createApp() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("api");
  app.useGlobalFilters(new ApiExceptionFilter());
  return app;
}

async function bootstrap() {
  const config = loadAppConfig();
  const app = await createApp();
  await app.listen(config.port);
}

if (require.main === module) {
  void bootstrap();
}
