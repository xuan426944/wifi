import { AdminRole } from "./types";

export const roleLabels: Record<AdminRole, string> = {
  super_admin: "超级管理员",
  operator: "运营",
  finance: "财务",
  risk: "风控",
  customer_service: "客服",
  readonly_audit: "只读审计",
};

export const rolePermissions: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  operator: [
    "admin.dashboard.read",
    "merchant.create",
    "merchant.audit",
    "store.create",
    "wifi.write",
    "ads.read",
    "ads.write",
    "ranking.read",
    "ranking.write",
    "operation_log.read",
  ],
  finance: [
    "admin.dashboard.read",
    "revenue.read",
    "revenue.confirm",
    "reconciliation.read",
    "reconciliation.handle",
    "wallet.read",
    "wallet.adjust",
    "withdraw.read",
    "withdraw.review",
    "operation_log.read",
  ],
  risk: [
    "admin.dashboard.read",
    "merchant.disable",
    "risk.read",
    "risk.handle",
    "ranking.read",
    "ranking.write",
    "wallet.read",
    "withdraw.read",
    "withdraw.review",
    "operation_log.read",
  ],
  customer_service: ["admin.dashboard.read", "operation_log.read"],
  readonly_audit: [
    "admin.dashboard.read",
    "ads.read",
    "revenue.read",
    "wallet.read",
    "withdraw.read",
    "reconciliation.read",
    "risk.read",
    "ranking.read",
    "system_config.read",
    "permission.read",
    "operation_log.read",
  ],
};

export const hasPermission = (role: AdminRole, permission: string) => {
  const permissions = rolePermissions[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
};
