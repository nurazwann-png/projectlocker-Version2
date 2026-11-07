"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACCENTS, THEMES, useAppearance } from "@/lib/appearance";
import { ICheck, IPalette, IPlus, IX } from "./icons";

export default function ThemePicker() {
  const { appearance, update } = useAppearance();
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

  const theme = THEMES.find((t) => t.id === appearance.theme) ?? THEMES[0];
  const customAccent = appearance.accent && !ACCENTS.includes(appearance.accent) ? appearance.accent : null;

  return (
    <>
      <button className="v-btn v-btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" title="Theme & colours">
        <IPalette /> <span className="v-hide-xs">Theme</span>
      </button>

      {mounted && open && createPortal(
        <div className="v-overlay" style={{ zIndex: 75 }}>
          <div className="v-backdrop" style={{ background: "transparent", backdropFilter: "none", WebkitBackdropFilter: "none" }} onClick={() => setOpen(false)} />
          <div className="v-appearance v-hud" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <span className="v-eyebrow">Appearance</span>
                <h2 id="appearance-title" className="v-dialog-title" style={{ marginTop: 10 }}>Make it yours</h2>
              </div>
              <button className="v-icon-btn" onClick={() => setOpen(false)} aria-label="Close"><IX /></button>
            </div>

            <div className="v-appearance-label">Theme</div>
            <div className="v-theme-grid" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={appearance.theme === t.id}
                  className="v-theme-card"
                  onClick={() => update({ theme: t.id })}
                >
                  <span className="v-theme-preview" style={{ background: t.bg, color: t.ink }}>
                    <span className="v-theme-preview-panel" style={{ background: t.panel }}>
                      <span style={{ fontFamily: t.font, fontSize: 17, lineHeight: 1 }}>Aa</span>
                      <span className="v-theme-preview-bar" style={{ background: `linear-gradient(90deg, ${t.colors.join(", ")})` }} />
                    </span>
                    <span className="v-theme-dots">{t.colors.map((c) => <i key={c} style={{ background: c }} />)}</span>
                    {appearance.theme === t.id && <span className="v-theme-check"><ICheck /></span>}
                  </span>
                  <span className="v-theme-name">{t.name}</span>
                  <span className="v-theme-desc">{t.desc}</span>
                </button>
              ))}
            </div>

            <div className="v-appearance-label">Accent colour</div>
            <div className="v-swatches" role="radiogroup" aria-label="Accent colour">
              <button
                role="radio"
                aria-checked={!appearance.accent}
                className="v-swatch is-auto"
                style={{ background: `conic-gradient(${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]}, ${theme.colors[0]})` }}
                onClick={() => update({ accent: null })}
                title={`${theme.name} default`}
                aria-label={`${theme.name} default accent`}
              />
              {ACCENTS.map((c) => (
                <button key={c} role="radio" aria-checked={appearance.accent === c} className="v-swatch" style={{ background: c }} onClick={() => update({ accent: c })} aria-label={`Accent ${c}`} title={c} />
              ))}
              <button
                role="radio"
                aria-checked={!!customAccent}
                className="v-swatch is-custom"
                style={customAccent ? { background: customAccent } : undefined}
                onClick={() => colorRef.current?.click()}
                title="Pick any colour"
                aria-label="Custom accent colour"
              >
                {!customAccent && <IPlus />}
              </button>
              <input
                ref={colorRef}
                type="color"
                value={appearance.accent ?? theme.colors[0]}
                onChange={(e) => update({ accent: e.target.value })}
                className="v-sr-only"
                tabIndex={-1}
                aria-hidden
              />
            </div>

            <div className="v-appearance-foot">
              <span className="v-hint">Saved on this device</span>
              <button className="v-btn v-btn-sm v-btn-quiet" onClick={() => update({ theme: "daylight", accent: null })}>Reset</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
