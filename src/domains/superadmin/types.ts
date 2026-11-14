export interface Role {
  id: number;
  name: string;
  domainId: number | null;
  isSuperadmin: boolean;
  permissionIds: number[];
}

export interface Domain {
  id: number;
  code: string;
  name: string;
}

export interface CreateRoleInput {
  name: string;
  domainId: number | null;
  isSuperadmin: false;
}

export interface UpdateRoleInput {
  name: string;
  domainId: number | null;
}

export interface Permission {
  id: number;
  code: string;
  resource: string;
  action: string;
  domainId: number | null;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  roleId: number;
}

export interface CreatedUser {
  id: number;
  username: string;
  email: string;
  roleId: number;
  createdAt: string;
}

export interface UserAccount {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password?: string;
  roleId?: number;
}

export type BugReportStatus = "OPEN" | "DIPROSES" | "SELESAI";

export interface BugReport {
  id: number;
  description: string;
  pageUrl: string;
  userAgent: string;
  screenshot: { thumb: string; display: string } | null;
  status: BugReportStatus;
  reporterName: string;
  reporterRole: string;
  handledByName: string | null;
  itNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "CANCEL";

export interface AuditLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: AuditAction;
  tableName: string;
  recordId: number;
  oldValues: unknown;
  newValues: unknown;
  createdAt: string;
}

export interface AuditLogParams {
  page?: number;
  pageSize?: number;
  tableName?: string;
  recordId?: number;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}
