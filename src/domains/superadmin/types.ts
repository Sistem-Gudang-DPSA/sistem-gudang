export interface Role {
  id: number;
  name: string;
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
