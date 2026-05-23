import { Inject, Injectable } from "@nestjs/common";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validatePhase02Schema } from "./schema";

export const MIGRATIONS_DIR = Symbol("MIGRATIONS_DIR");

@Injectable()
export class MigrationService {
  constructor(@Inject(MIGRATIONS_DIR) private readonly migrationsDir: string) {}

  listMigrationFiles() {
    return readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
  }

  readMigration(fileName: string) {
    return readFileSync(join(this.migrationsDir, fileName), "utf8");
  }

  validateLatest() {
    const [latest] = this.listMigrationFiles().slice(-1);
    const sql = this.readMigration(latest);
    return {
      fileName: latest,
      ...validatePhase02Schema(sql),
    };
  }
}
