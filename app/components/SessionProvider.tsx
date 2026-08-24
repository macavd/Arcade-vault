"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface SessionUser {
  name: string; // nombre en mayúsculas, máx 10 chars
}

export interface SessionValue {
  user: SessionUser | null;
  signIn: (name: string) => void; // guarda { name } en memoria
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  // Estado de sesión SOLO en memoria: se pierde al recargar.
  const [user, setUser] = useState<SessionUser | null>(null);

  const signIn = useCallback((name: string) => {
    const clean = name.trim().toUpperCase().slice(0, 10);
    if (!clean) return;
    setUser({ name: clean });
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<SessionValue>(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
