export { adminApiEndpoints, findAdminEndpoint } from "./api-client";
export { adminPages, getAdminPage } from "./admin-pages";
export { assertAdminPagesAreRunnable, createAdminShell, getPageApi } from "./admin-shell";
export { adminPageCatalog, getAdminEmptyState } from "./page-catalog";
export { hasPermission, roleLabels, rolePermissions } from "./permissions";
export type {
  AdminActionSpec,
  AdminPageRuntime,
  AdminPageSpec,
  AdminRole,
  ApiEndpointSpec,
  FieldControl,
  FormFieldSpec,
  PageStateKind,
  SearchFieldSpec,
  TableColumnSpec,
} from "./types";
