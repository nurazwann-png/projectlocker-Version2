"use client";

import { Suspense } from "react";
import AuthShell from "@/components/AuthShell";
import AuthForm from "@/components/AuthForm";
import { useT } from "@/lib/i18n";

export default function SignUpPage() {
  const t = useT();
  return (
    <AuthShell title={t("au.signUp")} titleEm={t("au.signUpEm")} sub={t("au.subUp")}>
      <Suspense>
        <AuthForm kind="sign-up" />
      </Suspense>
    </AuthShell>
  );
}
