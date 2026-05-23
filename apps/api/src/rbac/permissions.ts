export type AdminRole = "super_admin" | "operator" | "finance" | "risk" | "customer_service" | "readonly_audit";

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ["*"],
  operator: [
    "admin.dashboard.read",
    "merchant.create",
    "merchant.audit",
    "store.create",
    "wifi.write",
    "ads.write",
    "ranking.write",
  ],
  finance: [
    "admin.dashboard.read",
    "merchant.share_rate.write",
    "store.share_rate.write",
    "revenue.confirm",
    "wallet.read",
    "wallet.adjust",
    "withdraw.review",
    "operation_log.read",
  ],
  risk: [
    "admin.dashboard.read",
    "merchant.disable",
    "wallet.read",
    "withdraw.review",
    "risk.handle",
    "ranking.write",
    "operation_log.read",
  ],
  customer_service: ["admin.dashboard.read", "operation_log.read"],
  readonly_audit: [
    "admin.dashboard.read",
    "ads.read",
    "revenue.read",
    "wallet.read",
    "withdraw.read",
    "risk.read",
    "ranking.read",
    "system_config.read",
    "permission.read",
    "operation_log.read",
  ],
};

export const hasPermission = (role: AdminRole | undefined, permission: string) => {
  if (!role) {
    return false;
  }
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes("*") || permissions.includes(permission);
};
