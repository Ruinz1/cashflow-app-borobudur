import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { hakAksesApi, authApi } from "@/lib/api";

export interface User {
  id: string;
  namaLengkap: string;
  username: string;
  role: string;
  status: "aktif" | "nonaktif";
}

// Simple in-memory hak akses cache (loaded after login)
let hakAksesCache: Record<string, Record<string, string>> = {};

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (halaman: string) => "CRUD" | "VIEW" | "NONE";
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Session helpers (sessionStorage — hanya token & user info) ──────────────
function getSessionUser(): User | null {
  const s = sessionStorage.getItem("cashflow_session");
  return s ? JSON.parse(s) : null;
}
function saveSessionUser(user: User) {
  sessionStorage.setItem("cashflow_session", JSON.stringify(user));
}
function clearSessionUser() {
  sessionStorage.removeItem("cashflow_session");
}

function getSessionToken(): string | null {
  return sessionStorage.getItem("cashflow_token");
}
function saveSessionToken(token: string) {
  sessionStorage.setItem("cashflow_token", token);
}
function clearSessionToken() {
  sessionStorage.removeItem("cashflow_token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getSessionToken();
    const session = getSessionUser();

    if (token && session) {
      // Verify token still valid
      Promise.all([authApi.me(), hakAksesApi.get()])
        .then(([me, hak]) => {
          const u: User = {
            id: me.id,
            namaLengkap: me.namaLengkap,
            username: me.username,
            role: me.role,
            status: me.status as "aktif" | "nonaktif",
          };
          saveSessionUser(u);
          setUser(u);
          hakAksesCache = hak;
        })
        .catch(() => {
          // Token expired or invalid
          clearSessionToken();
          clearSessionUser();
        })
        .finally(() => setIsLoading(false));
    } else {
      clearSessionToken();
      clearSessionUser();
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await authApi.login(username, password);

      if (!data.ok) {
        return { success: false, error: "Username atau password salah." };
      }

      saveSessionToken(data.token);

      const u: User = {
        id: data.user.id,
        namaLengkap: data.user.namaLengkap,
        username: data.user.username,
        role: data.user.role,
        status: data.user.status as "aktif" | "nonaktif",
      };
      saveSessionUser(u);
      
      try {
        hakAksesCache = await hakAksesApi.get();
      } catch {}

      setUser(u);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Tidak dapat terhubung ke server." };
    }
  };

  const logout = async () => {
    const token = getSessionToken();
    if (token) {
      authApi.logout().catch(() => {});
    }
    clearSessionToken();
    clearSessionUser();
    hakAksesCache = {};
    setUser(null);
  };

  const hasAccess = (halaman: string): "CRUD" | "VIEW" | "NONE" => {
    if (!user) return "NONE";
    const roleHak = hakAksesCache[user.role] || {};
    return (roleHak[halaman] as "CRUD" | "VIEW" | "NONE") || "NONE";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
