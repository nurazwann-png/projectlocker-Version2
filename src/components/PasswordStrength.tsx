"use client";

import { useT, type TKey } from "@/lib/i18n";

const COMMON = /^(password|passw0rd|12345678|123456789|qwerty|iloveyou|admin|welcome|letmein|abc12345|11111111|sayang)/i;

/** 0 (too short) to 4 (strong). A rough guide only; the server also refuses breached passwords. */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length < 8) return 0;
  if (COMMON.test(pw) || /^(.)\1+$/.test(pw)) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  let score = (pw.length >= 12 ? 2 : 1) + (kinds >= 3 ? 1 : 0) + (pw.length >= 16 || kinds === 4 ? 1 : 0);
  if (pw.length >= 20) score = 4;
  return Math.min(4, score) as 1 | 2 | 3 | 4;
}

const LABELS: TKey[] = ["au.strength0", "au.strength1", "au.strength2", "au.strength3", "au.strength4"];

export default function PasswordStrength({ password }: { password: string }) {
  const t = useT();
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="pw-meter" data-score={score} aria-live="polite">
      <div className="pw-bars" aria-hidden="true">{[1, 2, 3, 4].map((i) => <span key={i} className={i <= score ? "on" : ""} />)}</div>
      <span className="pw-label">{t(LABELS[score])}</span>
      {score > 0 && score < 3 && <span className="pw-tip">{t("au.strengthTip")}</span>}
    </div>
  );
}
