"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { post, tokenStorage } from "@dinespot/utils/api";
import type { User, AuthResponse } from "@dinespot/types";

interface AuthContextValue {
  user:     User | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  logout:   () => Promise<void>;
  refetch:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, loading: true,
  login: async () => {}, logout: async () => {}, refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const token = tokenStorage.getAccess();
    if (!token) { setLoading(false); return; }
    try {
      const { get } = await import("@dinespot/utils/api");
      const me = await get<User>("/auth/me");
      setUser(me);
    } catch { setUser(null); tokenStorage.clear(); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const login = async (email: string, password: string) => {
    const data = await post<AuthResponse>("/auth/login", { email, password });
    tokenStorage.setAccess(data.tokens.accessToken);
    tokenStorage.setRefresh(data.tokens.refreshToken);
    setUser(data.user as User);
  };

  const logout = async () => {
    try { await post("/auth/logout"); } catch { /* silent */ }
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch }}>
      {children as any}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
