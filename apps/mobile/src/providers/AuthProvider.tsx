import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, tokenStore } from "../lib/api";
import type { User } from "@dinespot/types";

interface AuthCtx {
  user:    User | null;
  loading: boolean;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, login: async () => {}, logout: async () => {}, refetch: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const token = await tokenStore.getAccess();
    if (!token) { setLoading(false); return; }
    try {
      const me = await apiGet<User>("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
      await tokenStore.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const login = async (email: string, password: string) => {
    const data = await apiPost<{ user: User; tokens: { accessToken: string; refreshToken: string } }>("/auth/login", { email, password });
    await tokenStore.setAccess(data.tokens.accessToken);
    await tokenStore.setRefresh(data.tokens.refreshToken);
    setUser(data.user as User);
  };

  const logout = async () => {
    try { await apiPost("/auth/logout"); } catch { /* silent */ }
    await tokenStore.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, refetch }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
