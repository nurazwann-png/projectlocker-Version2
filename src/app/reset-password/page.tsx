"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordStrength from "@/components/PasswordStrength";
import { useSession } from "@/lib/session";
import { useT, type TKey } from "@/lib/i18n";
import { IArrowUpRight } from "@/components/icons";

const ERRORS: Record<string, TKey> = {
  password: "au.errPassword",
  breached: "au.errBreached",
  rate_limited: "au.errRate",
};

function ResetForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const [token] = useState(() => params.get("token") ?? "");
  const [status, setStatus] = useState<"checking" | "valid" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);

  useEffect(() => {
    // Take the token out of the address bar so it doesn't linger in history or screenshots.
    if (token) window.history.replaceState(null, "", "/reset-password");
    if (!token) return setStatus("expired");
    fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => setStatus(b.valid ? "valid" : "expired"))
      .catch(() => setStatus("expired"));
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) return setError("au.errPassword");
    if (password !== confirm) return setError("au.errConfirm");
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "expired") return setStatus("expired");
        return setError(ERRORS[body.error as string] ?? "au.errFailed");
      }
      await refresh();
      router.replace("/");
    } catch {
      setError("au.errFailed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") {
    return <div className="au-form v-hud"><p className="au-form-sub">{t("rp.checking")}</p></div>;
  }

  if (status === "expired") {
    return (
      <div className="au-form v-hud">
        <h2 className="au-form-title">{t("rp.expiredTitle")}</h2>
        <p className="au-form-sub">{t("rp.expired")}</p>
        <Link href="/forgot-password" className="v-btn v-btn-lg v-btn-primary au-submit">{t("rp.newLink")} <IArrowUpRight /></Link>
        <p className="au-switch"><Link href="/sign-in">{t("fp.back")}</Link></p>
      </div>
    );
  }

  const type = show ? "text" : "password";
  return (
    <form className="au-form v-hud" onSubmit={submit} noValidate>
      <h2 className="au-form-title">{t("rp.formTitle")}</h2>
      <p className="au-form-sub">{t("rp.formSub")}</p>
      <div className="v-field">
        <label className="v-label" htmlFor="rp-pass">
          {t("sec.new")}
          <button type="button" className="au-show" onClick={() => setShow((s) => !s)}>{t(show ? "au.hide" : "au.show")}</button>
        </label>
        <input id="rp-pass" className="v-input" type={type} autoComplete="new-password" maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {password ? <PasswordStrength password={password} /> : <span className="v-hint">{t("au.passwordHint")}</span>}
      </div>
      <div className="v-field">
        <label className="v-label" htmlFor="rp-confirm">{t("sec.confirm")}</label>
        <input id="rp-confirm" className="v-input" type={type} autoComplete="new-password" maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <div className="au-error" role="alert">{t(error)}</div>}
      <button type="submit" className="v-btn v-btn-lg v-btn-primary au-submit" disabled={busy}>
        {busy ? t("au.working") : <>{t("rp.save")} <IArrowUpRight /></>}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const t = useT();
  return (
    <AuthShell title={t("rp.title")} titleEm={t("rp.titleEm")} sub={t("rp.sub")}>
      <Suspense><ResetForm /></Suspense>
    </AuthShell>
  );
}
