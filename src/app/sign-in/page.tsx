"use client";

import { Suspense } from "react";
import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";
import { useT } from "@/lib/i18n";

export default function SignInPage() {
  const t = useT();
  return (
    <AuthShell title={t("au.signIn")} titleEm={t("au.signInEm")} sub={t("au.sub")}>
      <Suspense>
        <AuthForm kind="sign-in" />
      </Suspense>
    </AuthShell>
  );
}
