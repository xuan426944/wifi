import { adminPages } from "./admin-pages";

export interface AdminPageSpec {
  path: string;
  title: string;
  permission: string;
  fields: string[];
  actions: string[];
  emptyState: string;
  highRiskActions?: string[];
}

export const adminPageCatalog: AdminPageSpec[] = adminPages.map((page) => ({
  path: page.path,
  title: page.title,
  permission: page.permission,
  fields: page.tableColumns.map((column) => column.label),
  actions: page.actions.map((action) => action.label),
  highRiskActions: page.actions.filter((action) => action.highRisk).map((action) => action.label),
  emptyState: page.emptyState,
}));

export const getAdminEmptyState = (path: string) =>
  adminPageCatalog.find((page) => page.path === path)?.emptyState ?? "暂无数据";
