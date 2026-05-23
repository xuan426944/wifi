import { PHASE_02_REQUIRED_TABLES } from "./entities";

export interface MigrationValidationResult {
  tableCount: number;
  tables: string[];
  missingTables: string[];
  valid: boolean;
}

export const extractCreateTableNames = (sql: string) => {
  const names = new Set<string>();
  const pattern = /CREATE\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s*\(/gi;
  let match = pattern.exec(sql);
  while (match) {
    names.add(match[1]);
    match = pattern.exec(sql);
  }
  return [...names].sort();
};

export const validatePhase02Schema = (sql: string): MigrationValidationResult => {
  const tables = extractCreateTableNames(sql);
  const missingTables = PHASE_02_REQUIRED_TABLES.filter((table) => !tables.includes(table));
  return {
    tableCount: tables.length,
    tables,
    missingTables,
    valid: missingTables.length === 0,
  };
};
