"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export interface ProfileLinks {
  github?: string;
  linkedin?: string;
  website?: string;
}

export interface CoverPosition {
  x: number;
  y: number;
  scale: number;
}

export interface ProfileData {
  bio: string;
  cover: string | null;
  coverPosition: CoverPosition;
  avatar: string | null;
  links: ProfileLinks;
  skills: string[];
  username?: string | null;
  notesPin?: string | null;
  preferredView?: "grid" | "list" | "timeline";
  displayName?: string;
}

const LOCAL_KEY = "locker-profile-local";
const DEFAULT_NAME = "Nurazwann bin Ismail";
const DEFAULT_PROFILE: ProfileData = {
  bio: "Full-stack developer — building tools that make teachers' lives easier.",
  cover: null,
  coverPosition: { x: 50, y: 50, scale: 1 },
  avatar: null,
  links: {},
  skills: ["Next.js", "TypeScript", "Laravel", "Python", "PostgreSQL"],
  username: null,
  notesPin: null,
  preferredView: "grid",
  displayName: DEFAULT_NAME,
};

export type UsernameResult = { ok: true } | { ok: false; error: string };

async function profileApi(init?: RequestInit) {
  const res = await fetch("/api/profile", { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error ?? `Profile API → ${res.status}`), { status: res.status });
  return body;
}

export function useProfile() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const mode = !isLoaded ? "loading" : isSignedIn ? "cloud" : "local";

  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode === "loading") return;
    if (mode === "local") {
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        setProfile(raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw), username: null } : DEFAULT_PROFILE);
      } catch {
        setProfile(DEFAULT_PROFILE);
      }
      setHydrated(true);
      return;
    }
    profileApi()
      .then((row: Record<string, unknown>) => {
        setProfile({
          bio: (row.bio as string) ?? "",
          cover: (row.coverUrl as string) ?? null,
          coverPosition: row.coverPosition ? (JSON.parse(row.coverPosition as string) as CoverPosition) : DEFAULT_PROFILE.coverPosition,
          avatar: (row.avatarUrl as string) ?? null,
          links: (row.links as ProfileLinks) ?? {},
          skills: (row.skills as string[]) ?? [],
          username: (row.username as string) ?? null,
          notesPin: (row.notesPin as string) ?? null,
          preferredView: ((row.preferredView as string) ?? "grid") as ProfileData["preferredView"],
        });
      })
      .catch(() => setProfile({ ...DEFAULT_PROFILE, bio: "", skills: [] }))
      .finally(() => setHydrated(true));
  }, [mode]);

  const persist = useCallback((next: ProfileData) => {
    if (mode === "local") {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      profileApi({
        method: "PUT",
        body: JSON.stringify({
          bio: next.bio,
          coverUrl: next.cover,
          coverPosition: JSON.stringify(next.coverPosition),
          avatarUrl: next.avatar,
          links: next.links,
          skills: next.skills,
        }),
      }).catch(() => {});
    }, 600);
  }, [mode]);

  const patch = useCallback((changes: Partial<ProfileData>) => {
    setProfile((p) => {
      const next = { ...p, ...changes };
      persist(next);
      return next;
    });
  }, [persist]);

  const setBio = useCallback((bio: string) => patch({ bio }), [patch]);
  const setCover = useCallback((cover: string | null) => patch({ cover }), [patch]);
  const setCoverPosition = useCallback((coverPosition: CoverPosition) => patch({ coverPosition }), [patch]);
  const setAvatar = useCallback((avatar: string | null) => patch({ avatar }), [patch]);
  const setLinks = useCallback((links: ProfileLinks) => patch({ links }), [patch]);
  const setSkills = useCallback((skills: string[]) => patch({ skills }), [patch]);

  const setDisplayName = useCallback(async (name: string) => {
    const clean = name.trim().slice(0, 60);
    if (mode === "cloud" && user) {
      const [firstName, ...rest] = clean.split(/\s+/);
      await user.update({ firstName: firstName ?? "", lastName: rest.join(" ") }).catch(() => {});
      return;
    }
    patch({ displayName: clean });
  }, [mode, user, patch]);

  /** Usernames live on the server, so claiming one needs an account. */
  const setUsername = useCallback(async (raw: string): Promise<UsernameResult> => {
    const username = raw.trim().toLowerCase();
    if (mode !== "cloud") return { ok: false, error: "signin" };
    if (!/^[a-z0-9-]{3,30}$/.test(username)) return { ok: false, error: "format" };
    try {
      await profileApi({ method: "PUT", body: JSON.stringify({ username }) });
      setProfile((p) => ({ ...p, username }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as { status?: number }).status === 409 ? "taken" : "failed" };
    }
  }, [mode]);

  const setNotesPin = useCallback((notesPin: string) => {
    setProfile((p) => {
      const next = { ...p, notesPin };
      if (mode === "local") persist(next);
      return next;
    });
  }, [mode, persist]);

  const setPreferredView = useCallback((preferredView: "grid" | "list" | "timeline") => {
    setProfile((p) => {
      const next = { ...p, preferredView };
      if (mode === "local") persist(next);
      return next;
    });
    if (mode === "cloud") profileApi({ method: "PUT", body: JSON.stringify({ preferredView }) }).catch(() => {});
  }, [mode, persist]);

  const displayName = mode === "cloud"
    ? (user?.fullName || user?.username || profile.username || "Your name")
    : (profile.displayName || DEFAULT_NAME);

  return {
    profile, hydrated, mode, displayName,
    updateProfile: patch,
    setBio, setCover, setCoverPosition, setAvatar, setLinks, setSkills,
    setDisplayName, setUsername, setNotesPin, setPreferredView,
  };
}
