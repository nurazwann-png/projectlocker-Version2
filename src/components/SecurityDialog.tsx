"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useT, type TKey } from "@/lib/i18n";
import { IX } from "./icons";
import PasswordStrength from "./PasswordStrength";

const ERRORS: Record<string, TKey> = {
  current: "au.errCurrent",
  same: "au.errSame",
  password: "au.errPassword",
  breached: "au.errBreached",
  rate_limited: "au.errRate",
};

/** Change password and sign out other devices. */
export default function SecurityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<"password" | "devices" | null>(null);
  const [error, setError] = useState<TKey | null>(null);
  const [done, setDone] = useState<TKey | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrent(""); setNext(""); setConfirm(""); setShow(false); setError(null); setDone(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError(null); setDone(null);
    if (next.length < 8) return setError("au.errPassword");
    if (next !== confirm) return setError("au.errConfirm");
    setBusy("password");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return setError(ERRORS[body.error as string] ?? "au.errFailed");
      }
      setCurrent(""); setNext(""); setConfirm("");
      setDone("sec.saved");
    } catch {
      setError("au.errFailed");
    } finally {
      setBusy(null);
    }
  }

  async function signOutOthers() {
    setError(null); setDone(null); setBusy("devices");
    try {
      const res = await fetch("/api/auth/sessions", { method: "DELETE", credentials: "include" });
      if (res.ok) setDone("sec.signedOutOthers"); else setError("au.errFailed");
    } catch {
      setError("au.errFailed");
    } finally {
      setBusy(null);
    }
  }

  const type = show ? "text" : "password";

  // Rendered on <body> so the nav bar's blur/stacking can't clip the drawer.
  return createPortal(
    <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="sec-title">
      <div className="v-backdrop" onClick={onClose} />
      <div className="v-drawer">
        <div className="v-drawer-head">
          <span className="v-eyebrow">{t("sec.eyebrow")}</span>
          <button className="v-icon-btn" onClick={onClose} aria-label={t("common.close")}><IX /></button>
        </div>

        <div className="v-drawer-body">
          <h2 id="sec-title" className="v-form-title">{t("sec.title")} <em>{t("sec.titleEm")}</em></h2>
          <p style={{ color: "var(--v-muted)", marginTop: 14, fontSize: 14.5, lineHeight: 1.6 }}>{t("sec.sub")}</p>

          {done && <div className="sec-ok" role="status">{t(done)}</div>}
          {error && <div className="au-error" role="alert">{t(error)}</div>}

          <form className="sec-card" onSubmit={changePassword} noValidate>
            <h3>{t("sec.changeTitle")}</h3>
            <div className="v-field" style={{ marginTop: 14 }}>
              <label className="v-label" htmlFor="sec-current" style={{ display: "flex", justifyContent: "space-between" }}>
                {t("sec.current")}
                <button type="button" className="au-show" onClick={() => setShow((s) => !s)}>{t(show ? "au.hide" : "au.show")}</button>
              </label>
              <input id="sec-current" className="v-input" type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="v-field">
              <label className="v-label" htmlFor="sec-new">{t("sec.new")}</label>
              <input id="sec-new" className="v-input" type={type} autoComplete="new-password" maxLength={200} value={next} onChange={(e) => setNext(e.target.value)} />
              {next ? <PasswordStrength password={next} /> : <span className="v-hint">{t("au.passwordHint")}</span>}
            </div>
            <div className="v-field">
              <label className="v-label" htmlFor="sec-confirm">{t("sec.confirm")}</label>
              <input id="sec-confirm" className="v-input" type={type} autoComplete="new-password" maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button type="submit" className="v-btn v-btn-primary" style={{ marginTop: 16 }} disabled={busy !== null || !current || !next}>
              {busy === "password" ? t("au.working") : t("sec.save")}
            </button>
          </form>

          <div className="sec-card">
            <h3>{t("sec.devicesTitle")}</h3>
            <p>{t("sec.devicesSub")}</p>
            <button type="button" className="v-btn" style={{ marginTop: 14 }} onClick={signOutOthers} disabled={busy !== null}>
              {busy === "devices" ? t("au.working") : t("sec.signOutOthers")}
            </button>
          </div>

          <p className="sec-note">{t("sec.protections")}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
