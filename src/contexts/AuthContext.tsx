import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, getSession, saveSession, clearSession, getUsers, getUserAccess, initStorage } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
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
    const session = getSession();
    if (session) {
      setUser(session);
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string) => {
    const users = getUsers();
    const found = users.find(u => u.username === username && u.password === password && u.status === "aktif");
    if (!found) {
      return { success: false, error: "Username atau password salah, atau akun tidak aktif." };
    }
    saveSession(found);
    setUser(found);
    return { success: true };
  };

  const logout = () => {
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
