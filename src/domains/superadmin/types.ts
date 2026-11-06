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
