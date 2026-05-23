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
    "ranking.read",
    "ranking.write",
  ],
  finance: [
    "admin.dashboard.read",
    "merchant.share_rate.write",
    "store.share_rate.write",
    "revenue.confirm",
    "wallet.read",
    "wallet.adjust",
    "withdraw.read",
    "withdraw.review",
    "operation_log.read",
  ],
  risk: [
    "admin.dashboard.read",
    "merchant.disable",
    "wallet.read",
    "withdraw.read",
    "withdraw.review",
    "risk.read",
    "risk.handle",
    "ranking.read",
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

export const isAdminRole = (role: string): role is AdminRole =>
  ["super_admin", "operator", "finance", "risk", "customer_service", "readonly_audit"].includes(role);

export const resolveMockAdminRole = (username?: string): AdminRole => {
  if (!username || username === "admin") {
    return "super_admin";
  }
  if (isAdminRole(username)) {
    return username;
  }
  return "readonly_audit";
};
