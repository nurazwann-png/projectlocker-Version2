"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { monogram } from "@/lib/projectMeta";

/** Signed-in user's avatar button with a small menu (name, email, sign out). */
export default function AccountMenu() {
  const t = useT();
  const router = useRouter();
  const { user, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  if (!user) return null;

  async function doSignOut() {
    setOpen(false);
    await signOut();
    router.replace("/landing");
    router.refresh();
  }

  return (
    <div className="am-wrap" ref={ref}>
      <button type="button" className="am-btn" aria-haspopup="menu" aria-expanded={open} aria-label={user.name} onClick={() => setOpen((o) => !o)}>
        {monogram(user.name || user.email)}
      </button>
      {open && (
        <div className="am-menu" role="menu">
          <div className="am-who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button type="button" role="menuitem" className="am-item" onClick={doSignOut}>{t("au.signOut")}</button>
        </div>
      )}
    </div>
  );
}
