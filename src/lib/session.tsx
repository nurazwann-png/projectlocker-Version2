"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  appearance: unknown;
  isAdmin?: boolean;
}

interface SessionValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: SessionUser | null;
  /** Re-read the account from the server (after login or register). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Save name and/or appearance to the account. */
  updateUser: (changes: { name?: string; appearance?: unknown }) => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setLoaded] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
      const body = res.ok ? await res.json() : { user: null };
      setUser(body.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
  }, []);

  const updateUser = useCallback(async (changes: { name?: string; appearance?: unknown }) => {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    if (!res.ok) throw new Error(`Account update failed (${res.status})`);
    const body = await res.json();
    setUser((u) => (u && body.user ? { ...u, ...body.user } : u));
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ isLoaded, isSignedIn: !!user, user, refresh, signOut, updateUser }),
    [isLoaded, user, refresh, signOut, updateUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Where to go after signing in: only same-site paths, never another origin. */
export function safeRedirect(target: string | null | undefined, fallback = "/"): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  return target;
}
