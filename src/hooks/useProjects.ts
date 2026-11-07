"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, ProjectFormData } from "@/types/project";

function capitaliseStatus(s: string): Project["status"] {
  const map: Record<string, Project["status"]> = { live: "Live", maintenance: "Maintenance", deprecated: "Deprecated" };
  return map[s?.toLowerCase()] ?? (s as Project["status"]);
}

// Normalise a raw API row into the Project shape the UI expects
function normalise(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
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
    features: [],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string | undefined,
  };
}

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error(`API ${init?.method ?? "GET"} ${path} → ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    apiFetch("/api/projects")
      .then((rows) => setProjects((rows as Record<string, unknown>[]).map(normalise)))
      .catch(() => setProjects([]))
      .finally(() => setHydrated(true));
  }, []);

  const addProject = useCallback(async (data: ProjectFormData): Promise<Project> => {
    const payload = {
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
    try {
      const row = await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(payload) });
      const project = normalise(row as Record<string, unknown>);
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch {
      // Local-only fallback when API is unreachable (e.g. unauthenticated)
      const project: Project = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: data.name,
        description: data.description,
        status: data.status,
        liveUrl: data.liveUrl ?? "",
        repoUrl: data.repoUrl ?? "",
        techStack: data.techStack,
        notes: data.notes ?? "",
        notesLocked: false,
        pinned: data.pinned ?? false,
        deploymentDate: data.deploymentDate ?? "",
        thumbnail: data.thumbnail ?? null,
        features: data.features ?? [],
        createdAt: new Date().toISOString(),
      };
      setProjects((prev) => [project, ...prev]);
      return project;
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: ProjectFormData): Promise<void> => {
    const payload = {
      title: data.name,
      description: data.description,
      status: data.status,
      liveUrl: data.liveUrl,
      repoUrl: data.repoUrl,
      techStack: data.techStack,
      notes: data.notes ?? "",
      deploymentDate: data.deploymentDate ?? "",
      coverImage: data.thumbnail ?? null,
    };
    try {
      const row = await apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      const updated = normalise(row as Record<string, unknown>);
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...updated, features: data.features ?? p.features } : p)));
    } catch {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p)));
    }
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    apiFetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const togglePin = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const pinnedCount = prev.filter((p) => p.pinned).length;
      if (!target.pinned && pinnedCount >= 3) return prev;
      const newPinned = !target.pinned;
      apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ pinned: newPinned }) }).catch(() => {});
      return prev.map((p) => (p.id === id ? { ...p, pinned: newPinned } : p));
    });
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string): Promise<void> => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
    apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ notes }) }).catch(() => {});
  }, []);

  const updateNotesLock = useCallback((id: string, notesLocked: boolean): void => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, notesLocked } : p)));
    apiFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ notesLocked }) }).catch(() => {});
  }, []);

  // Import: upsert each project via the API
  const importProjects = useCallback(async (incoming: Project[]): Promise<void> => {
    const results = await Promise.allSettled(
      incoming.map((p) =>
        apiFetch("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            title: p.name, description: p.description, status: p.status,
            liveUrl: p.liveUrl, repoUrl: p.repoUrl, techStack: p.techStack,
            notes: p.notes ?? "", pinned: p.pinned ?? false,
            deploymentDate: p.deploymentDate ?? "", coverImage: p.thumbnail ?? null,
          }),
        }).then((row) => normalise(row as Record<string, unknown>))
      )
    );
    // Fall back to the incoming record when the API is unreachable
    const created = results.map((r, i) => (r.status === "fulfilled" ? r.value : { ...incoming[i], features: incoming[i].features ?? [] }));
    setProjects((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const p of created) map.set(p.id, p);
      return [...map.values()];
    });
  }, []);

  return { projects, hydrated, addProject, updateProject, updateNotes, updateNotesLock, togglePin, deleteProject, importProjects };
}
