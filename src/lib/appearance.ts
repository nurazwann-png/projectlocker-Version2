import { useCallback, useEffect, useState } from "react";
import { APPEARANCE_STORAGE_KEY as STORAGE_KEY, THEME_IDS } from "./appearanceBoot";

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

export interface Appearance {
  theme: ThemeId;
  accent: string | null;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: "daylight", accent: null };

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

function readAppearance(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (raw && THEMES.some((t) => t.id === raw.theme)) {
      return { theme: raw.theme, accent: typeof raw.accent === "string" && hexToRgb(raw.accent) ? raw.accent : null };
    }
  } catch {
    // storage unavailable or corrupt — fall back to default
  }
  return DEFAULT_APPEARANCE;
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => { setAppearance(readAppearance()); }, []);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((prev) => {
      const next = { ...prev, ...patch };
      applyAppearance(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, []);

  return { appearance, update };
}

