"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeRedirect, useSession } from "@/lib/session";
import { useT, type TKey } from "@/lib/i18n";
import { IArrowUpRight } from "./icons";
import PasswordStrength from "./PasswordStrength";

const SERVER_ERRORS: Record<string, TKey> = {
  name: "au.errName",
  email: "au.errEmail",
  password: "au.errPassword",
  taken: "au.errTaken",
  invalid: "au.errInvalid",
  rate_limited: "au.errRate",
  breached: "au.errBreached",
  locked: "au.errLocked",
};

/** Registration and login form, styled like the rest of the app. */
export default function AuthForm({ kind }: { kind: "sign-in" | "sign-up" }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();
  const isUp = kind === "sign-up";
  const redirect = safeRedirect(params.get("redirect_url"));
  const query = params.get("redirect_url") ? `?redirect_url=${encodeURIComponent(redirect)}` : "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TKey | null>(null);
  const [field, setField] = useState<string | null>(null);

  function fail(key: TKey, which: string | null = null) { setError(key); setField(which); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (isUp && !name.trim()) return fail("au.errName", "name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail("au.errEmail", "email");
    if (isUp && password.length < 8) return fail("au.errPassword", "password");
    if (isUp && password !== confirm) return fail("au.errConfirm", "confirm");

    setBusy(true); setError(null); setField(null);
    try {
      const res = await fetch(`/api/auth/${isUp ? "register" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isUp ? { name, email, password } : { email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const key = SERVER_ERRORS[body.error as string] ?? "au.errFailed";
        const which = body.error === "taken" ? "email" : body.error === "breached" ? "password" : ["name", "email", "password"].includes(body.error) ? body.error : null;
        return fail(key, which);
      }
      await refresh();
      router.replace(redirect);
      router.refresh();
    } catch {
      fail("au.errFailed");
    } finally {
      setBusy(false);
    }
  }

  const err = (f: string) => (field === f ? " is-error" : "");

  return (
    <form className="au-form v-hud" onSubmit={submit} noValidate>
      <h2 className="au-form-title">{t(isUp ? "au.formUp" : "au.formIn")}</h2>
      <p className="au-form-sub">{t(isUp ? "au.formUpSub" : "au.formInSub")}</p>

      {isUp && (
        <div className="v-field">
          <label className="v-label" htmlFor="au-name">{t("au.name")}</label>
          <input id="au-name" className={`v-input${err("name")}`} autoComplete="name" maxLength={60} value={name} placeholder={t("au.namePh")} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      )}

      <div className="v-field">
        <label className="v-label" htmlFor="au-email">{t("au.email")}</label>
        <input id="au-email" className={`v-input${err("email")}`} type="email" autoComplete="email" inputMode="email" maxLength={200} value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} autoFocus={!isUp} />
      </div>

      <div className="v-field">
        <label className="v-label" htmlFor="au-pass">
          {t("au.password")}
          <button type="button" className="au-show" onClick={() => setShow((s) => !s)}>{t(show ? "au.hide" : "au.show")}</button>
        </label>
        <input id="au-pass" className={`v-input${err("password")}`} type={show ? "text" : "password"} autoComplete={isUp ? "new-password" : "current-password"} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)} />
        {isUp && (password ? <PasswordStrength password={password} /> : <span className="v-hint">{t("au.passwordHint")}</span>)}
        {!isUp && <Link href={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`} className="au-forgot">{t("au.forgot")}</Link>}
      </div>

      {isUp && (
        <div className="v-field">
          <label className="v-label" htmlFor="au-confirm">{t("au.confirm")}</label>
          <input id="au-confirm" className={`v-input${err("confirm")}`} type={show ? "text" : "password"} autoComplete="new-password" maxLength={200} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      )}

      {error && <div className="au-error" role="alert">{t(error)}</div>}

      <button type="submit" className="v-btn v-btn-lg v-btn-primary au-submit" disabled={busy}>
        {busy ? t("au.working") : <>{t(isUp ? "au.submitUp" : "au.submitIn")} <IArrowUpRight /></>}
      </button>

      <p className="au-switch">
        {t(isUp ? "au.haveAccount" : "au.noAccount")}{" "}
        <Link href={`/${isUp ? "sign-in" : "sign-up"}${query}`}>{t(isUp ? "au.toIn" : "au.toUp")}</Link>
      </p>
    </form>
  );
}
