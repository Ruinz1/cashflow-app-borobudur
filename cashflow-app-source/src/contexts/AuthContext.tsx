import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  User,
  getSession, saveSession, clearSession,
  getSessionToken, saveSessionToken, clearSessionToken,
  getUserAccess, initStorage,
} from "@/lib/storage";
import { initFromDatabase, syncLocalStorageToDb } from "@/lib/dbSync";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (halaman: string) => "CRUD" | "VIEW" | "NONE";
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initStorage();
    // Hydrate dari DB (non-blocking; fallback ke localStorage jika DB offline)
    initFromDatabase().finally(() => {
      const session = getSession();
      const token = getSessionToken();
      if (session && token) {
        setUser(session);
      } else if (session && !token) {
        // Ada sesi lama tapi token sudah hilang (server restart) — minta login ulang
        clearSession();
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!data.ok) {
        return { success: false, error: data.error || "Username atau password salah." };
      }

      // Simpan token dan sesi
      saveSessionToken(data.token as string);
      const userObj: User = {
        id: String(data.user.id),
        namaLengkap: data.user.namaLengkap,
        username: data.user.username,
        password: "",  // tidak dikirim dari server, kosongkan
        role: data.user.role,
        status: data.user.status as "aktif" | "nonaktif",
      };
      saveSession(userObj);
      setUser(userObj);

      // Push data localStorage ke DB (fire-and-forget, tidak blokir UI)
      syncLocalStorageToDb().catch(() => {});

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Tidak dapat terhubung ke server." };
    }
  };

  const logout = async () => {
    const token = getSessionToken();
    if (token) {
      // Notify server untuk invalidate token (best-effort)
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      }).catch(() => {});
    }
    clearSessionToken();
    clearSession();
    setUser(null);
  };

  const hasAccess = (halaman: string): "CRUD" | "VIEW" | "NONE" => {
    if (!user) return "NONE";
    return getUserAccess(user.role, halaman);
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
