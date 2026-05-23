import { SetMetadata } from "@nestjs/common";

export const PUBLIC_ROUTE = "public_route";
export const ADMIN_PERMISSION = "admin_permission";
export const MERCHANT_ROUTE = "merchant_route";
export const AUDIT_ACTION = "audit_action";

export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE, true);
export const RequirePermission = (permission: string) => SetMetadata(ADMIN_PERMISSION, permission);
export const MerchantRoute = () => SetMetadata(MERCHANT_ROUTE, true);
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION, action);
