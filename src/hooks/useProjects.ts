"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Project, ProjectFormData } from "@/types/project";

export type StorageMode = "loading" | "local" | "cloud";

const LOCAL_KEY = "locker-projects-local";
// The database has no column for highlights, so signed-in users keep them per device.
const FEATURES_KEY = "locker-features";

function capitaliseStatus(s: string): Project["status"] {
  const map: Record<string, Project["status"]> = { live: "Live", maintenance: "Maintenance", deprecated: "Deprecated" };
  return map[s?.toLowerCase()] ?? (s as Project["status"]);
}

function normalise(row: Record<string, unknown>, features: Record<string, string[]>): Project {
  const id = row.id as string;
  return {
    id,
    name: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    status: capitaliseStatus((row.status as string) ?? "Live"),
    liveUrl: (row.liveUrl as string) ?? "",
    repoUrl: (row.repoUrl as string) ?? "",
    techStack: (row.techStack as string[]) ?? [],
    notes: (row.notes as string) ?? "",
    notesLocked: (row.notesLocked as boolean) ?? false,
    pinned: (row.pinned as boolean) ?? false,
    deploymentDate: (row.deploymentDate as string) ?? "",
    thumbnail: (row.coverImage as string | null) ?? null,
    features: features[id] ?? [],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string | undefined,
  };
}

function toPayload(data: Partial<ProjectFormData>) {
  return {
    title: data.name,
    description: data.description,
    status: data.status,
    liveUrl: data.liveUrl,
    repoUrl: data.repoUrl,
    techStack: data.techStack,
    notes: data.notes ?? "",
    pinned: data.pinned ?? false,
    deploymentDate: data.deploymentDate ?? "",
    coverImage: data.thumbnail ?? null,
  };
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error(`API ${init?.method ?? "GET"} ${path} → ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the browser refused to store (quota or private mode). */
function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function newLocalProject(data: ProjectFormData): Project {
  return {
    ...data,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    liveUrl: data.liveUrl ?? "",
    repoUrl: data.repoUrl ?? "",
    notes: data.notes ?? "",
    notesLocked: data.notesLocked ?? false,
    pinned: data.pinned ?? false,
    features: data.features ?? [],
    createdAt: new Date().toISOString(),
  };
}

export function useProjects() {
  const { isLoaded, isSignedIn } = useAuth();
  const mode: StorageMode = !isLoaded ? "loading" : isSignedIn ? "cloud" : "local";

  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const [localPending, setLocalPending] = useState<Project[]>([]);
  const featuresRef = useRef<Record<string, string[]>>({});

  // Load whenever the storage mode settles or changes (e.g. after signing in)
  useEffect(() => {
    if (mode === "loading") return;
    setHydrated(false);
    if (mode === "local") {
      setProjects(readJSON<Project[]>(LOCAL_KEY, []));
      setLocalPending([]);
      setHydrated(true);
      return;
    }
    featuresRef.current = readJSON<Record<string, string[]>>(FEATURES_KEY, {});
    setLocalPending(readJSON<Project[]>(LOCAL_KEY, []));
    apiFetch("/api/projects")
      .then((rows) => setProjects((rows as Record<string, unknown>[]).map((r) => normalise(r, featuresRef.current))))
      .catch(() => setProjects([]))
      .finally(() => setHydrated(true));
  }, [mode]);

  // Local mode: every change is written straight to this browser
  useEffect(() => {
    if (mode !== "local" || !hydrated) return;
    setStorageFull(!writeJSON(LOCAL_KEY, projects));
  }, [projects, mode, hydrated]);

  const rememberFeatures = useCallback((id: string, features: string[] | undefined) => {
    if (mode !== "cloud") return;
    featuresRef.current = { ...featuresRef.current, [id]: features ?? [] };
    writeJSON(FEATURES_KEY, featuresRef.current);
  }, [mode]);

  const addProject = useCallback(async (data: ProjectFormData): Promise<Project> => {
    if (mode === "cloud") {
      try {
        const row = await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(toPayload(data)) });
        rememberFeatures((row as { id: string }).id, data.features);
        const project = normalise(row as Record<string, unknown>, featuresRef.current);
        setProjects((prev) => [project, ...prev]);
        return project;
      } catch {
        // fall through to a local record so the user's input isn't lost
      }
    }
    const project = newLocalProject(data);
    setProjects((prev) => [project, ...prev]);
    return project;
  }, [mode, rememberFeatures]);

  const updateProject = useCallback(async (id: string, data: ProjectFormData): Promise<void> => {
    if (mode === "cloud" && !id.startsWith("local-")) {
      try {
        const row = await apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(toPayload(data)) });
        rememberFeatures(id, data.features);
        const updated = normalise(row as Record<string, unknown>, featuresRef.current);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        return;
      } catch {
        // keep the edit locally even if the server rejected it
      }
    }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)));
  }, [mode, rememberFeatures]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (mode === "cloud") apiFetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
  }, [mode]);

  const patchCloud = useCallback((id: string, body: Record<string, unknown>) => {
    if (mode === "cloud") apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }).catch(() => {});
  }, [mode]);

  const togglePin = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      if (!target.pinned && prev.filter((p) => p.pinned).length >= 3) return prev;
      patchCloud(id, { pinned: !target.pinned });
      return prev.map((p) => (p.id === id ? { ...p, pinned: !target.pinned } : p));
    });
  }, [patchCloud]);

  const updateNotes = useCallback(async (id: string, notes: string): Promise<void> => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
    patchCloud(id, { notes });
  }, [patchCloud]);

  const updateNotesLock = useCallback((id: string, notesLocked: boolean): void => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, notesLocked } : p)));
    patchCloud(id, { notesLocked });
  }, [patchCloud]);

  const importProjects = useCallback(async (incoming: Project[]): Promise<void> => {
    let created: Project[] = incoming.map((p) => ({ ...p, features: p.features ?? [] }));
    if (mode === "cloud") {
      const results = await Promise.allSettled(
        incoming.map((p) =>
          apiFetch("/api/projects", { method: "POST", body: JSON.stringify(toPayload(p)) }).then((row) => {
            rememberFeatures((row as { id: string }).id, p.features);
            return normalise(row as Record<string, unknown>, featuresRef.current);
          })
        )
      );
      created = results.map((r, i) => (r.status === "fulfilled" ? r.value : created[i]));
    }
    setProjects((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of created) map.set(p.id, p);
      return [...map.values()];
    });
  }, [mode, rememberFeatures]);

  /** Signed in with projects still saved in this browser: upload them, then clear the local copy. */
  const moveLocalToCloud = useCallback(async () => {
    if (mode !== "cloud" || localPending.length === 0) return;
    await importProjects(localPending);
    try { localStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
    setLocalPending([]);
  }, [mode, localPending, importProjects]);

  const dismissLocal = useCallback(() => setLocalPending([]), []);

  return {
    projects, hydrated, mode, storageFull, localPending,
    addProject, updateProject, updateNotes, updateNotesLock, togglePin, deleteProject, importProjects,
    moveLocalToCloud, dismissLocal,
  };
}
