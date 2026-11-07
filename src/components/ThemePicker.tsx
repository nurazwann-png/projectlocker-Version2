"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACCENTS, THEMES, useAppearance, type Lang } from "@/lib/appearance";
import { useT, type TKey } from "@/lib/i18n";
import { ICheck, IPalette, IPlus, IX } from "./icons";

const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "ms", label: "Bahasa Melayu" },
];

export default function ThemePicker() {
  const { appearance, update, syncsToAccount } = useAppearance();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const colorRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const theme = THEMES.find((x) => x.id === appearance.theme) ?? THEMES[0];
  const themeName = t(`theme.${theme.id}` as TKey);
  const customAccent = appearance.accent && !ACCENTS.includes(appearance.accent) ? appearance.accent : null;

  return (
    <>
      <button className="v-btn v-btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" title={t("ap.title")}>
        <IPalette /> <span className="v-hide-xs">{t("nav.theme")}</span>
      </button>

      {mounted && open && createPortal(
        <div className="v-overlay" style={{ zIndex: 75 }}>
          <div className="v-backdrop" style={{ background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none" }} onClick={() => setOpen(false)} />
          <div className="v-appearance v-hud" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <span className="v-eyebrow">{t("ap.eyebrow")}</span>
                <h2 id="appearance-title" className="v-dialog-title" style={{ marginTop: 10 }}>{t("ap.title")}</h2>
              </div>
              <button className="v-icon-btn" onClick={() => setOpen(false)} aria-label={t("common.close")}><IX /></button>
            </div>

            <div className="v-appearance-label">{t("ap.theme")}</div>
            <div className="v-theme-grid" role="radiogroup" aria-label={t("ap.theme")}>
              {THEMES.map((th) => (
                <button key={th.id} role="radio" aria-checked={appearance.theme === th.id} className="v-theme-card" onClick={() => update({ theme: th.id })}>
                  <span className="v-theme-preview" style={{ background: th.bg, color: th.ink }}>
                    <span className="v-theme-preview-panel" style={{ background: th.panel }}>
                      <span style={{ fontFamily: th.font, fontSize: 17, lineHeight: 1 }}>Aa</span>
                      <span className="v-theme-preview-bar" style={{ background: `linear-gradient(90deg, ${th.colors.join(", ")})` }} />
                    </span>
                    <span className="v-theme-dots">{th.colors.map((c) => <i key={c} style={{ background: c }} />)}</span>
                    {appearance.theme === th.id && <span className="v-theme-check"><ICheck /></span>}
                  </span>
                  <span className="v-theme-name">{t(`theme.${th.id}` as TKey)}</span>
                  <span className="v-theme-desc">{t(`theme.${th.id}.desc` as TKey)}</span>
                </button>
              ))}
            </div>

            <div className="v-appearance-label">{t("ap.accent")}</div>
            <div className="v-swatches" role="radiogroup" aria-label={t("ap.accent")}>
              <button
                role="radio"
                aria-checked={!appearance.accent}
                className="v-swatch is-auto"
                style={{ background: `conic-gradient(${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]}, ${theme.colors[0]})` }}
                onClick={() => update({ accent: null })}
                title={t("ap.default", { theme: themeName })}
                aria-label={t("ap.default", { theme: themeName })}
              />
              {ACCENTS.map((c) => (
                <button key={c} role="radio" aria-checked={appearance.accent === c} className="v-swatch" style={{ background: c }} onClick={() => update({ accent: c })} aria-label={c} title={c} />
              ))}
              <button
                role="radio"
                aria-checked={!!customAccent}
                className="v-swatch is-custom"
                style={customAccent ? { background: customAccent } : undefined}
                onClick={() => colorRef.current?.click()}
                title={t("ap.custom")}
                aria-label={t("ap.custom")}
              >
                {!customAccent && <IPlus />}
              </button>
              <input ref={colorRef} type="color" value={appearance.accent ?? theme.colors[0]} onChange={(e) => update({ accent: e.target.value })} className="v-sr-only" tabIndex={-1} aria-hidden />
            </div>

            <div className="v-appearance-label">{t("ap.language")}</div>
            <div className="v-seg" role="radiogroup" aria-label={t("ap.language")} style={{ width: "100%" }}>
              {LANG_OPTIONS.map((l) => (
                <button key={l.id} role="radio" aria-checked={appearance.lang === l.id} aria-pressed={appearance.lang === l.id} onClick={() => update({ lang: l.id })} style={{ flex: 1, height: 30 }}>
                  {l.label}
                </button>
              ))}
            </div>

            <label className="v-toggle-row">
              <span>
                <span style={{ display: "block", fontWeight: 500 }}>{t("ap.lite")}</span>
                <span className="v-hint" style={{ fontFamily: "var(--v-sans)", fontSize: 12 }}>{t("ap.liteHint")}</span>
              </span>
              <input type="checkbox" className="v-switch" checked={appearance.lite} onChange={(e) => update({ lite: e.target.checked })} />
            </label>

            <div className="v-appearance-foot">
              <span className="v-hint">{syncsToAccount ? t("ap.savedAccount") : t("ap.savedDevice")}</span>
              <button className="v-btn v-btn-sm v-btn-quiet" onClick={() => update({ theme: "daylight", accent: null, lite: false })}>{t("common.reset")}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
