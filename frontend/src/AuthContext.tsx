import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (p: {
    email: string;
    password: string;
    role: "ta" | "mo" | "admin";
    display_name?: string;
    student_id?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const u = await api.auth.me();
      setUser(u);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.auth.login(email, password);
    setToken(access_token);
    const u = await api.auth.me();
    setUser(u);
    return u;
  };

  const register = async (p: {
    email: string;
    password: string;
    role: "ta" | "mo" | "admin";
    display_name?: string;
    student_id?: string;
  }) => {
    const { access_token } = await api.auth.register(p);
    setToken(access_token);
    const u = await api.auth.me();
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      if (getToken()) await api.auth.logout();
    } catch {
      /* 忽略网络错误，仍清除本地会话 */
    }
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
