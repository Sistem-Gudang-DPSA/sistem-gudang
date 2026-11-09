export interface AuthUser {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  isSuperadmin: boolean;
  permissions: string[];
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}
