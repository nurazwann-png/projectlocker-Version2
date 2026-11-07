import type { CSSProperties } from "react";
import type { Project, ProjectStatus } from "@/types/project";

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function healthScore(project: Project): number {
  let score = 100;
  if (project.status === "Maintenance") score -= 20;
  if (project.status === "Deprecated") score -= 60;
  const dateStr = project.deploymentDate?.trim() || project.createdAt;
  const ageYears = (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 3600 * 1000);
  score -= Math.min(30, Math.floor(Math.max(0, ageYears) * 5));
  return Math.max(0, Math.min(100, score));
}

export function healthColor(score: number): string {
  if (score >= 75) return "var(--v-live)";
  if (score >= 45) return "var(--v-amber)";
  return "var(--v-coral)";
}

export const STATUS_CLASS: Record<ProjectStatus, string> = {
  Live: "is-live",
  Maintenance: "is-maint",
  Deprecated: "is-dep",
};

const COVER_HUES = ["var(--v-c1)", "var(--v-c2)", "var(--v-c3)", "var(--v-live)", "var(--v-amber)"];

export function coverVars(name: string): CSSProperties {
  const h = hashStr(name || "?");
  const a = h % COVER_HUES.length;
  const b = (a + 1 + ((h >> 3) % (COVER_HUES.length - 1))) % COVER_HUES.length;
  return {
    "--c": COVER_HUES[a],
    "--c2": COVER_HUES[b],
    "--cx": `${15 + (h % 70)}%`,
    "--cy": `${5 + ((h >> 4) % 60)}%`,
    "--ang": `${(h >> 7) % 180}deg`,
  } as CSSProperties;
}

export function monogram(name: string): string {
  const t = name.trim();
  return t ? t[0].toUpperCase() : "·";
}

export function coverCode(name: string): string {
  return `LK-${(hashStr(name) % 9000) + 1000}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value?: string, opts: { year?: boolean } = { year: true }): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const base = `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]}`;
  return opts.year ? `${base} ${d.getFullYear()}` : base;
}

export function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}
