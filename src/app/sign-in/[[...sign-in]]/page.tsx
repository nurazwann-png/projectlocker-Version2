"use client";

import { SignIn } from "@clerk/nextjs";
import AuthShell, { useClerkThemeVars } from "@/components/AuthShell";
import { useT } from "@/lib/i18n";

export default function SignInPage() {
  const t = useT();
  const variables = useClerkThemeVars();
  return (
    <AuthShell title={t("au.signIn")} titleEm={t("au.signInEm")}>
      {variables && <SignIn forceRedirectUrl="/" appearance={{ variables }} />}
    </AuthShell>
  );
}
