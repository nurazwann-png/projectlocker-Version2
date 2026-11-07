"use client";

import { SignUp } from "@clerk/nextjs";
import AuthShell, { useClerkThemeVars } from "@/components/AuthShell";
import { useT } from "@/lib/i18n";

export default function SignUpPage() {
  const t = useT();
  const variables = useClerkThemeVars();
  return (
    <AuthShell title={t("au.signUp")} titleEm={t("au.signUpEm")}>
      {variables && <SignUp forceRedirectUrl="/" appearance={{ variables }} />}
    </AuthShell>
  );
}
