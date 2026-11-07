"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import ThemePicker from "@/components/ThemePicker";
import { IArrowLeft, IArrowUpRight, ILock, ISearch, LockerMark } from "@/components/icons";
import { monogram, pad } from "@/lib/projectMeta";

interface CommunityProfile {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  projectCount: number;
}

const CX_CSS = `
.cx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
.cx-card { display: flex; flex-direction: column; text-decoration: none; color: var(--v-text); padding: 22px; min-height: 210px; }
.cx-avatar { width: 64px; height: 64px; border-radius: 18px; padding: 2px; background: var(--v-grad); box-shadow: 0 0 30px -10px rgba(var(--v-c2-rgb),0.8); flex-shrink: 0; }
.cx-avatar > * { width: 100%; height: 100%; border-radius: 16px; overflow: hidden; background: var(--v-panel); display: grid; place-items: center; object-fit: cover; }
.cx-avatar span { font: 700 26px var(--v-display); letter-spacing: -0.06em; }
.cx-name { font-family: var(--v-display); font-weight: 500; font-size: 20px; letter-spacing: -0.04em; margin-top: 18px; overflow-wrap: anywhere; }
.cx-bio { margin-top: 8px; color: var(--v-muted); font-size: 13.5px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cx-cta { margin-top: auto; padding-top: 18px; display: inline-flex; align-items: center; gap: 6px; font: 500 12.5px var(--v-sans); color: var(--v-signal); }
.cx-cta svg { width: 13px; height: 13px; transition: transform .3s var(--v-ease); }
.cx-card:hover .cx-cta svg { transform: translate(2px, -2px); }
.cx-hero { padding: clamp(48px, 8vw, 96px) 0 36px; text-align: center; }
.cx-title { font-family: var(--v-display); font-weight: 500; font-size: clamp(34px, 6vw, 76px); line-height: 1; letter-spacing: -0.055em; margin-top: 18px; }
.cx-search { max-width: 560px; margin: 0 auto 36px; }
.cx-search .v-input { width: 100%; height: 44px; }
.cx-gate { min-height: calc(100vh - 62px); display: grid; place-items: center; padding: 32px 16px; position: relative; z-index: 1; }
.cx-gate-panel { width: min(420px, 100%); padding: 32px 28px; text-align: center; border: 1px solid var(--v-line-2); border-radius: 18px; background-color: var(--v-panel); box-shadow: 0 30px 80px -30px rgba(var(--v-scrim-rgb),0.45), 0 0 50px -24px rgba(var(--v-c2-rgb),0.6); animation: vPop .4s var(--v-ease) both; }
.cx-lock { width: 56px; height: 56px; margin: 22px auto 0; display: grid; place-items: center; border-radius: 16px; color: var(--v-signal); background: rgba(var(--v-c1-rgb),0.1); border: 1px solid rgba(var(--v-c1-rgb),0.35); box-shadow: 0 0 26px -8px rgba(var(--v-c1-rgb),0.7); }
.cx-lock svg { width: 24px; height: 24px; }
`;


function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <div className="vault">
      <style>{CX_CSS}</style>
      <div className="v-atmos" />
      <div className="v-noise" />
      <nav className="v-nav">
        <div className="v-wrap v-nav-inner">
          <Link href="/landing" className="v-brand" aria-label="Project Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Project Locker</span>
            <span className="v-brand-path">/ community</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemePicker />
            {right}
          </div>
        </div>
      </nav>
      {children}
      <footer className="v-footer">
        <div className="v-wrap"><div className="v-footer-mark" aria-hidden>AZWANN ANIS</div></div>
        <div className="v-wrap v-footer-inner">
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>© {year} Nurazwann bin Ismail · Azwann Anis</span>
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}

export default function CommunityPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Only signed-in members can see the community
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    fetch("/api/community", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (Array.isArray(data)) setProfiles(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn]);

  const filtered = useMemo(() => {
    if (!query.trim()) return profiles;
    const q = query.toLowerCase();
    return profiles.filter((p) => p.username?.toLowerCase().includes(q) || p.bio?.toLowerCase().includes(q));
  }, [profiles, query]);

  const homeLink = <Link href="/landing" className="v-btn v-btn-sm v-btn-quiet"><IArrowLeft /> <span className="v-hide-xs">Home</span></Link>;

  // ── Checking sign-in ──
  if (!isLoaded) return (
    <Shell>
      <div className="cx-gate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="px-spinner" />
          <span className="v-mono" style={{ color: "var(--v-signal)" }}>Checking access…</span>
        </div>
      </div>
    </Shell>
  );

  // ── Signed out: members only ──
  if (!isSignedIn) return (
    <Shell right={homeLink}>
      <div className="cx-gate">
        <div className="cx-gate-panel v-hud">
          <span className="v-eyebrow">Members only</span>
          <h1 className="v-dialog-title" style={{ marginTop: 14, fontSize: 26 }}>Project Locker Community</h1>
          <div className="cx-lock"><ILock /></div>
          <p style={{ color: "var(--v-muted)", lineHeight: 1.6, margin: "18px 0 22px" }}>
            Sign in to meet other builders<br />and browse their portfolios.
          </p>
          <SignInButton mode="modal">
            <button type="button" className="v-btn v-btn-lg v-btn-primary" style={{ width: "100%" }}>Sign in <IArrowUpRight /></button>
          </SignInButton>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--v-line)" }}>
            <SignUpButton mode="modal">
              <button type="button" className="v-btn v-btn-sm v-btn-quiet">New here? Create an account</button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </Shell>
  );

  return (
    <Shell right={<Link href="/" className="v-btn v-btn-sm v-btn-quiet"><IArrowLeft /> <span className="v-hide-xs">My locker</span></Link>}>
      <main className="v-main v-wrap">
        <header className="cx-hero">
          <span className="v-eyebrow v-rise">Builders &amp; makers · {loading ? "––" : pad(profiles.length)} members</span>
          <h1 className="cx-title v-rise" style={{ animationDelay: "100ms" }}>Meet the <span className="v-grad-text">community.</span></h1>
        </header>

        <label className="v-search cx-search">
          <ISearch />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or bio…" className="v-input" aria-label="Search members" />
        </label>

        {loading ? (
          <div className="cx-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="v-card cx-card" style={{ cursor: "default", animationDelay: `${i * 60}ms` }}>
                <div className="v-skel" style={{ width: 64, height: 64, borderRadius: 18 }} />
                <div className="v-skel" style={{ height: 18, width: "55%", marginTop: 20 }} />
                <div className="v-skel" style={{ height: 12, width: "85%", marginTop: 12 }} />
                <div className="v-skel" style={{ height: 12, width: "65%", marginTop: 8 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center" }}>
            <p className="v-display" style={{ fontSize: 28 }}>{query ? <>No one matches <span className="v-grad-text">that</span>.</> : <>No members <span className="v-grad-text">yet</span>.</>}</p>
            <p style={{ color: "var(--v-muted)", marginTop: 12 }}>{query ? "Try a different name or keyword." : "Be the first to share your locker."}</p>
          </div>
        ) : (
          <div className="cx-grid">
            {filtered.map((p, i) => (
              <Link
                key={p.username}
                href={`/u/${p.username}`}
                className="v-card cx-card"
                style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div className="cx-avatar">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.avatarUrl ? <img src={p.avatarUrl} alt={`${p.username} avatar`} /> : <div><span className="v-grad-text">{monogram(p.username ?? "?")}</span></div>}
                  </div>
                  <span className="v-chip" style={{ paddingRight: 10 }}>{pad(p.projectCount)} project{p.projectCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="cx-name">@{p.username}</div>
                {p.bio && <p className="cx-bio">{p.bio}</p>}
                <span className="cx-cta">View portfolio <IArrowUpRight /></span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </Shell>
  );
}
