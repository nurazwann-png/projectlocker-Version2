import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";
import { APPEARANCE_STORAGE_KEY as STORAGE_KEY, LANGS, THEME_IDS } from "./appearanceBoot";

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  desc: string;
  bg: string;
  panel: string;
  ink: string;
  colors: [string, string, string];
  font: string;
}

// Swatch values mirror the theme tokens in globals.css
export const THEMES: ThemeMeta[] = [
  { id: "daylight", name: "Daylight", desc: "Light · futuristic", bg: "#f4f6fd", panel: "#ffffff", ink: "#0e1433", colors: ["#0891b2", "#7c3aed", "#db2777"], font: "'Unbounded', sans-serif" },
  { id: "neon", name: "Neon", desc: "Dark · sci-fi glow", bg: "#0b0f1e", panel: "#121830", ink: "#eef2ff", colors: ["#22e4ff", "#8b5cff", "#ff3dcf"], font: "'Unbounded', sans-serif" },
  { id: "traditional", name: "Traditional", desc: "Songket · maroon & gold", bg: "#f6eee0", panel: "#fffaf1", ink: "#2b130d", colors: ["#9b1c31", "#c08a1e", "#1f5e5b"], font: "'Instrument Serif', serif" },
  { id: "nature", name: "Nature", desc: "Forest · leaf & clay", bg: "#eef2e6", panel: "#fcfdf8", ink: "#18261a", colors: ["#2f7d4f", "#7aa531", "#d9822b"], font: "'Fraunces', serif" },
  { id: "ocean", name: "Ocean", desc: "Calm · deep & reef", bg: "#eaf4fa", panel: "#ffffff", ink: "#0a2638", colors: ["#0077b6", "#00a6c9", "#2ec4b6"], font: "'Unbounded', sans-serif" },
  { id: "sunset", name: "Sunset", desc: "Warm · coral & gold", bg: "#fff1e8", panel: "#ffffff", ink: "#2a1110", colors: ["#f0531c", "#e11d74", "#f59e0b"], font: "'Unbounded', sans-serif" },
];

export const ACCENTS = ["#0891b2", "#2563eb", "#7c3aed", "#c026d3", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0d9488"];

export type Lang = (typeof LANGS)[number];

export interface Appearance {
  theme: ThemeId;
  accent: string | null;
  lite: boolean;
  lang: Lang;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "daylight", accent: null, lite: false, lang: "en" };

function hexToRgb(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function readableOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb.split(",").map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#0a0a0f" : "#ffffff";
}

export function applyAppearance(a: Appearance) {
  const el = document.documentElement;
  el.dataset.vtheme = a.theme;
  el.lang = a.lang;
  if (a.lite) el.dataset.vlite = "1";
  else delete el.dataset.vlite;
  const rgb = a.accent ? hexToRgb(a.accent) : null;
  if (a.accent && rgb) {
    el.style.setProperty("--v-c1", a.accent);
    el.style.setProperty("--v-c1-rgb", rgb);
    el.style.setProperty("--v-on-accent", readableOn(a.accent));
  } else {
    el.style.removeProperty("--v-c1");
    el.style.removeProperty("--v-c1-rgb");
    el.style.removeProperty("--v-on-accent");
  }
}

function sanitize(raw: unknown): Appearance {
  const r = (raw ?? {}) as Partial<Appearance>;
  return {
    theme: THEME_IDS.includes(r.theme as ThemeId) ? (r.theme as ThemeId) : DEFAULT_APPEARANCE.theme,
    accent: typeof r.accent === "string" && hexToRgb(r.accent) ? r.accent : null,
    lite: r.lite === true,
    lang: LANGS.includes(r.lang as Lang) ? (r.lang as Lang) : DEFAULT_APPEARANCE.lang,
  };
}

// One module-level store so every component (picker, translated text, …) stays in sync.
let current: Appearance = DEFAULT_APPEARANCE;
let loaded = false;
let pulledFromAccount = false;
let accountTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { current = sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")); } catch { /* defaults */ }
}

function setAppearance(next: Appearance) {
  current = next;
  applyAppearance(next);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { ensureLoaded(); listeners.add(l); return () => { listeners.delete(l); }; };
const getSnapshot = () => { ensureLoaded(); return current; };
const getServerSnapshot = () => DEFAULT_APPEARANCE;

export function useAppearance() {
  const appearance = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { user } = useUser();

  // Signed in: the account's saved appearance wins once per page load
  useEffect(() => {
    if (!user || pulledFromAccount) return;
    pulledFromAccount = true;
    const remote = (user.unsafeMetadata as { appearance?: unknown })?.appearance;
    if (remote) setAppearance(sanitize(remote));
  }, [user]);

  const update = useCallback((patch: Partial<Appearance>) => {
    const next = { ...current, ...patch };
    setAppearance(next);
    if (!user) return;
    if (accountTimer) clearTimeout(accountTimer);
    accountTimer = setTimeout(() => {
      user.update({ unsafeMetadata: { ...user.unsafeMetadata, appearance: next } }).catch(() => {});
    }, 700);
  }, [user]);

  return { appearance, update, syncsToAccount: Boolean(user) };
}

