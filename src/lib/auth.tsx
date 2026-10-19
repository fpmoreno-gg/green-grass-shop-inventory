import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ShopManager } from "../types/models";

interface AuthState {
  manager: ShopManager | null;
  signIn: (manager: ShopManager) => void;
  signOut: () => void;
}

const STORAGE_KEY = "green-grass-session";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [manager, setManager] = useState<ShopManager | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ShopManager) : null;
  });

  useEffect(() => {
    if (manager) localStorage.setItem(STORAGE_KEY, JSON.stringify(manager));
    else localStorage.removeItem(STORAGE_KEY);
  }, [manager]);

  const value = useMemo<AuthState>(
    () => ({
      manager,
      signIn: setManager,
      signOut: () => setManager(null),
    }),
    [manager],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
