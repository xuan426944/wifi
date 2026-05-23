export type AdminRole = "super_admin" | "operator" | "finance" | "risk" | "customer_service" | "readonly_audit";

export type PageStateKind = "loading" | "empty" | "ready" | "error" | "forbidden";

export type FieldControl =
  | "input"
  | "password"
  | "select"
  | "multi_select"
  | "date_range"
  | "number"
  | "money"
  | "switch"
  | "textarea"
  | "upload"
  | "readonly";

export interface SearchFieldSpec {
  key: string;
  label: string;
  control: FieldControl;
  options?: string[];
}

export interface TableColumnSpec {
  key: string;
  label: string;
  width?: number;
  sensitive?: boolean;
  moneyCent?: boolean;
}

export interface FormFieldSpec {
  key: string;
  label: string;
  control: FieldControl;
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
  sensitive?: boolean;
  helperText?: string;
}

export interface AdminActionSpec {
  key: string;
  label: string;
  permission: string;
  api?: string;
  method?: "GET" | "POST" | "PUT";
  confirmRequired?: boolean;
  reasonRequired?: boolean;
  highRisk?: boolean;
}

export interface ApiEndpointSpec {
  key: string;
  method: "GET" | "POST" | "PUT";
  path: string;
  permission: string;
  mockSafe: boolean;
}

export interface AdminPageSpec {
  path: string;
  title: string;
  navGroup: string;
  permission: string;
  apiKey: string;
  searchFields: SearchFieldSpec[];
  tableColumns: TableColumnSpec[];
  formFields: FormFieldSpec[];
  actions: AdminActionSpec[];
  emptyState: string;
  loadingText: string;
  errorText: string;
  forbiddenText: string;
  complianceNotice?: string;
}

export interface AdminPageRuntime {
  path: string;
  title: string;
  state: PageStateKind;
  visible: boolean;
  fields: string[];
  actions: AdminActionSpec[];
  emptyState: string;
  message: string;
}
