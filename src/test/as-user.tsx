import { AuthUserProvider } from '@/domains/auth/user-context';

// Test helper: renders `ui` as a non-superadmin holding `permissions` (or as a superadmin).
export const withUser = (ui: React.ReactNode, permissions: string[], isSuperadmin = false) => (
  <AuthUserProvider user={{ id: 1, username: 'u', email: 'u@x.id', roleId: 1, roleName: 'Role', isSuperadmin, permissions }}>
    {ui}
  </AuthUserProvider>
);
