import { findAdminEndpoint } from "./api-client";
import { adminPages } from "./admin-pages";
import { hasPermission, roleLabels } from "./permissions";
import { AdminPageRuntime, AdminRole, PageStateKind } from "./types";

export interface AdminShell {
  role: AdminRole;
  roleLabel: string;
  navGroups: Array<{
    name: string;
    pages: Array<{ path: string; title: string; active: boolean }>;
  }>;
  currentPage: AdminPageRuntime;
}

export const createAdminShell = (
  role: AdminRole,
  currentPath = "/admin/dashboard",
  state: PageStateKind = "empty",
): AdminShell => {
  const page = adminPages.find((item) => item.path === currentPath) ?? adminPages[0];
  const visiblePages = adminPages.filter((item) => hasPermission(role, item.permission));
  const navGroups = [...new Set(visiblePages.map((item) => item.navGroup))].map((name) => ({
    name,
    pages: visiblePages
      .filter((item) => item.navGroup === name)
      .map((item) => ({
        path: item.path,
        title: item.title,
        active: item.path === page.path,
      })),
  }));
  const visible = hasPermission(role, page.permission);
  return {
    role,
    roleLabel: roleLabels[role],
    navGroups,
    currentPage: {
      path: page.path,
      title: page.title,
      state: visible ? state : "forbidden",
      visible,
      fields: page.tableColumns.map((column) => column.label),
      actions: page.actions.filter((item) => hasPermission(role, item.permission)),
      emptyState: page.emptyState,
      message: messageForState(visible ? state : "forbidden", page),
    },
  };
};

export const getPageApi = (path: string) => {
  const page = adminPages.find((item) => item.path === path);
  return page ? findAdminEndpoint(page.apiKey) : undefined;
};

export const assertAdminPagesAreRunnable = () => {
  const missingApi = adminPages.filter((page) => !findAdminEndpoint(page.apiKey)).map((page) => page.path);
  if (missingApi.length > 0) {
    throw new Error(`Missing admin API bindings: ${missingApi.join(", ")}`);
  }
  const unsafeHighRisk = adminPages
    .flatMap((page) => page.actions.map((action) => ({ page: page.path, action })))
    .filter(({ action }) => action.highRisk && (!action.confirmRequired || !action.reasonRequired))
    .map(({ page, action }) => `${page}:${action.key}`);
  if (unsafeHighRisk.length > 0) {
    throw new Error(`High-risk actions without confirmation: ${unsafeHighRisk.join(", ")}`);
  }
  return true;
};

const messageForState = (state: PageStateKind, page: (typeof adminPages)[number]) => {
  if (state === "loading") {
    return page.loadingText;
  }
  if (state === "error") {
    return page.errorText;
  }
  if (state === "forbidden") {
    return page.forbiddenText;
  }
  if (state === "empty") {
    return page.emptyState;
  }
  return "已加载";
};
