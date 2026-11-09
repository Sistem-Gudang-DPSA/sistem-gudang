"use client";

import React, { createContext, useContext } from "react";
import type { AuthUser } from "./types";

const AuthUserContext = createContext<AuthUser | null>(null);

// Provided by the dashboard layout once the session is known, so screens can read who is logged in.
export const AuthUserProvider = ({ user, children }: { user: AuthUser; children: React.ReactNode }) => (
  <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>
);

export const useAuthUser = () => useContext(AuthUserContext);

// True when the user holds `permission`. A superadmin passes everything, and so does a screen rendered
// outside the layout (no user), because the route guard and the API still enforce access.
export const useCan = (permission: string) => {
  const user = useAuthUser();
  return !user || user.isSuperadmin || user.permissions.includes(permission);
};
