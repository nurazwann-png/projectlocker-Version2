"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import ThemePicker from "./ThemePicker";
import { useT } from "@/lib/i18n";
import { IArrowLeft, ILock, LockerMark } from "./icons";

export default function AuthShell({ children, title, titleEm, sub }: { children: ReactNode; title: string; titleEm: string; sub?: string }) {
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
            <Link href="/landing" className="v-btn v-btn-sm v-btn-quiet"><IArrowLeft /> {t("nav.home")}</Link>
          </div>
        </div>
      </nav>
      <main className="v-main v-wrap au-main">
        <div className="au-copy v-rise">
          <span className="v-eyebrow">Project Locker</span>
          <h1 className="au-title">{title} <span className="v-grad-text">{titleEm}</span></h1>
          <p className="au-sub">{sub ?? t("au.sub")}</p>
          <Link href="/admin" className="v-btn v-btn-sm" style={{ marginTop: 24 }}><ILock /> Admin</Link>
        </div>
        <div className="au-card v-rise" style={{ animationDelay: "120ms" }}>{children}</div>
      </main>
    </div>
  );
}
