export interface AuthUser {
  id: number;
  username: string;
  email: string;
  roleId: number;
  roleName: string;
  isSuperadmin: boolean;
  // Divisi of the role ("inventory", "ppic", ...). null = no divisi, so sidebar falls back to permissions only.
  domainCode?: string | null;
  permissions: string[];
}

export interface LoginResult {
  user: AuthUser;
  accessToken: string;
}
