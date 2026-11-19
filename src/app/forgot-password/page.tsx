"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { useT, type TKey } from "@/lib/i18n";
import { IArrowUpRight } from "@/components/icons";

function ForgotForm() {
  const t = useT();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("au.errEmail");
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) return setSent(true);
      const body = await res.json().catch(() => ({}));
      setError(body.error === "rate_limited" ? "au.errRate" : body.error === "mail_failed" ? "fp.errMail" : "au.errFailed");
    } catch {
      setError("au.errFailed");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="au-form v-hud">
        <h2 className="au-form-title">{t("fp.sentTitle")}</h2>
        <div className="au-done" role="status">{t("fp.sent")}</div>
        <button type="button" className="v-btn v-btn-lg au-submit" onClick={() => setSent(false)}>{t("fp.again")}</button>
        <p className="au-switch"><Link href="/sign-in">{t("fp.back")}</Link></p>
      </div>
    );
  }

  return (
    <form className="au-form v-hud" onSubmit={submit} noValidate>
      <h2 className="au-form-title">{t("fp.formTitle")}</h2>
      <p className="au-form-sub">{t("fp.formSub")}</p>
      <div className="v-field">
        <label className="v-label" htmlFor="fp-email">{t("au.email")}</label>
        <input id="fp-email" className={`v-input${error === "au.errEmail" ? " is-error" : ""}`} type="email" autoComplete="email" inputMode="email" maxLength={200} value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} autoFocus />
      </div>
      {error && <div className="au-error" role="alert">{t(error)}</div>}
      <button type="submit" className="v-btn v-btn-lg v-btn-primary au-submit" disabled={busy}>
        {busy ? t("au.working") : <>{t("fp.send")} <IArrowUpRight /></>}
      </button>
      <p className="au-switch"><Link href="/sign-in">{t("fp.back")}</Link></p>
    </form>
  );
}

export default function ForgotPasswordPage() {
  const t = useT();
  return (
    <AuthShell title={t("fp.title")} titleEm={t("fp.titleEm")} sub={t("fp.sub")}>
      <Suspense><ForgotForm /></Suspense>
    </AuthShell>
  );
}
