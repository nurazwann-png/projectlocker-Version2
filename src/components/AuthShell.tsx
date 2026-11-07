"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import ThemePicker from "./ThemePicker";
import { useAppearance } from "@/lib/appearance";
import { useT } from "@/lib/i18n";
import { IArrowLeft, ILock, LockerMark } from "./icons";

export interface ClerkVars {
  colorPrimary: string;
  colorText: string;
  colorTextSecondary: string;
  colorBackground: string;
  colorInputBackground: string;
  colorInputText: string;
  borderRadius: string;
  fontFamily: string;
}

/** Clerk takes concrete colours, so read the active theme tokens from the page. */
export function useClerkThemeVars(): ClerkVars | null {
  const { appearance } = useAppearance();
  const [vars, setVars] = useState<ClerkVars | null>(null);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string) => cs.getPropertyValue(name).trim();
    setVars({
      colorPrimary: v("--v-c1"),
      colorText: v("--v-text"),
      colorTextSecondary: v("--v-muted"),
      colorBackground: v("--v-panel"),
      colorInputBackground: v("--v-bg-2"),
      colorInputText: v("--v-text"),
      borderRadius: "10px",
      fontFamily: "Geist, system-ui, sans-serif",
    });
  }, [appearance.theme, appearance.accent]);
  return vars;
}

export default function AuthShell({ children, title, titleEm }: { children: ReactNode; title: string; titleEm: string }) {
  const t = useT();
  return (
    <div className="vault">
      <div className="v-atmos" />
      <div className="v-noise" />
      <nav className="v-nav">
        <div className="v-wrap v-nav-inner">
          <Link href="/landing" className="v-brand" aria-label="Project Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Project Locker</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemePicker />
            <Link href="/" className="v-btn v-btn-sm v-btn-quiet"><IArrowLeft /> {t("nav.enterApp")}</Link>
          </div>
        </div>
      </nav>
      <main className="v-main v-wrap au-main">
        <div className="au-copy v-rise">
          <span className="v-eyebrow">Project Locker</span>
          <h1 className="au-title">{title} <span className="v-grad-text">{titleEm}</span></h1>
          <p className="au-sub">{t("au.sub")}</p>
          <Link href="/admin" className="v-btn v-btn-sm" style={{ marginTop: 24 }}><ILock /> Admin</Link>
        </div>
        <div className="au-card v-rise" style={{ animationDelay: "120ms" }}>{children}</div>
      </main>
    </div>
  );
}
