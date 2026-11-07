"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth, SignInButton } from "@clerk/nextjs";
import ThemePicker from "@/components/ThemePicker";
import { IArrowLeft, ILock, ITrash, LockerMark } from "@/components/icons";
import { monogram, pad } from "@/lib/projectMeta";

interface RecentComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  acknowledged: boolean;
  projectId: string;
  projectTitle: string;
}

interface TopProject {
  projectId: string;
  title: string;
  count: number;
}

interface TopViewedProject {
  projectId: string;
  title: string;
  ownerUsername: string;
  totalViews: number;
}

interface RecentView {
  viewerName: string;
  isGuest: boolean;
  projectTitle: string;
  ownerUsername: string;
  createdAt: string;
}

interface StatusGroup {
  status: string;
  _count: { id: number };
}

interface Stats {
  totalProfiles: number;
  totalProjects: number;
  totalComments: number;
  acknowledgedComments: number;
  acknowledgedRate: number;
  recentComments: RecentComment[];
  topCommentedProjects: TopProject[];
  projectsByStatus: StatusGroup[];
  topViewedProjects: TopViewedProject[];
  recentViews: RecentView[];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  live: "var(--v-live)", wip: "var(--v-amber)", maintenance: "var(--v-amber)",
  archived: "var(--v-faint)", deprecated: "var(--v-coral)", planned: "var(--v-c2)",
};

const AX_CSS = `
.ax-panel { padding: 22px; border: 1px solid var(--v-line-2); border-radius: 16px; background-color: rgba(var(--v-surface-rgb),0.82); }
.ax-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.ax-stats { display: grid; grid-template-columns: repeat(4, 1fr); }
.ax-stats .v-stat:nth-child(3) .v-stat-num { color: var(--v-text); text-shadow: 0 0 28px rgba(var(--v-c3-rgb),0.35); }
.ax-stats .v-stat:nth-child(4) .v-stat-num { color: var(--v-live); text-shadow: 0 0 28px rgba(var(--v-live-rgb),0.45); }
@media (max-width: 720px) { .ax-stats { grid-template-columns: repeat(2, 1fr); } .ax-stats .v-stat:nth-child(3) { border-left: 0; } .ax-stats .v-stat:nth-child(n+3) { border-top: 1px solid var(--v-line); } }
.ax-two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 860px) { .ax-two { grid-template-columns: 1fr; } }
.ax-row { display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid var(--v-line); min-width: 0; }
.ax-row:last-child { border-bottom: 0; }
.ax-av { width: 30px; height: 30px; flex-shrink: 0; border-radius: 9px; overflow: hidden; display: grid; place-items: center; background: rgba(var(--v-c1-rgb),0.12); color: var(--v-signal); font: 600 13px var(--v-display); }
.ax-av img { width: 100%; height: 100%; object-fit: cover; }
.ax-name { font-size: 13.5px; font-weight: 500; color: var(--v-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ax-sub { font: 500 11px var(--v-mono); color: var(--v-faint); margin-top: 2px; }
.ax-rank { font: 500 11px var(--v-mono); color: var(--v-faint); width: 24px; flex-shrink: 0; }
.ax-gate { width: min(420px, 100%); margin: 48px auto 0; padding: 32px 28px; text-align: center; border: 1px solid var(--v-line-2); border-radius: 18px; background-color: var(--v-panel); box-shadow: 0 30px 80px -30px rgba(var(--v-scrim-rgb),0.45), 0 0 50px -24px rgba(var(--v-c2-rgb),0.6); animation: vPop .4s var(--v-ease) both; }
.ax-lock { width: 56px; height: 56px; margin: 0 auto 18px; display: grid; place-items: center; border-radius: 16px; color: var(--v-signal); background: rgba(var(--v-c1-rgb),0.1); border: 1px solid rgba(var(--v-c1-rgb),0.35); box-shadow: 0 0 26px -8px rgba(var(--v-c1-rgb),0.7); }
.ax-lock svg { width: 24px; height: 24px; }
.ax-pin { width: 52px; height: 58px; text-align: center; font: 600 22px var(--v-mono); padding: 0; }
.ax-alert { margin-bottom: 14px; padding: 12px 14px; border-radius: 12px; text-align: center; font-size: 13px; color: var(--v-coral); background: rgba(var(--v-coral-rgb),0.08); border: 1px solid rgba(var(--v-coral-rgb),0.3); }
`;

function SectionHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="ax-head"><span className="v-eyebrow">{children}</span>{right}</div>;
}

/* ── PIN gate ── */
function PinGate({ onVerified }: { onVerified: (pin: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError("");
    if (val && i < 3) refs[i + 1].current?.focus();
    if (!val && i > 0) refs[i - 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) { refs[i - 1].current?.focus(); }
    if (e.key === "Enter") handleSubmit();
  }

  async function handleSubmit() {
    const pin = digits.join("");
    if (pin.length !== 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) { setError("Incorrect PIN. Try again."); setDigits(["", "", "", ""]); refs[0].current?.focus(); return; }
      const { token } = await res.json();
      onVerified(token);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="v-mono" style={{ color: "var(--v-faint)", marginBottom: 12 }}>Admin PIN</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`v-input ax-pin${error ? " is-error" : ""}`}
            aria-label={`PIN digit ${i + 1}`}
            autoFocus={i === 0}
          />
        ))}
      </div>
      {error && <p className="v-error" style={{ marginTop: 10 }}>{error}</p>}
      <button onClick={handleSubmit} disabled={digits.join("").length !== 4 || loading} className="v-btn v-btn-lg v-btn-primary" style={{ width: "100%", marginTop: 16 }}>
        {loading ? "Verifying…" : "Enter"}
      </button>
    </div>
  );
}

interface MemberProfile {
  userId: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  projectCount: number;
}

/* ── Members section ── */
function MembersSection({ pinToken }: { pinToken?: string }) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (pinToken) headers["x-admin-pin"] = pinToken;
    fetch("/api/admin/profiles", { headers, credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pinToken]);

  async function handleDelete(userId: string) {
    setDeleting(userId);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (pinToken) headers["x-admin-pin"] = pinToken;
    try {
      const res = await fetch(`/api/admin/profiles/${userId}`, { method: "DELETE", headers, credentials: "include" });
      if (res.ok) setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } finally {
      setDeleting(null);
      setConfirm(null);
    }
  }

  return (
    <section className="ax-panel">
      <SectionHead right={!loading && <span className="v-mono" style={{ color: "var(--v-faint)" }}>{pad(members.length)} total</span>}>Members</SectionHead>
      {loading ? (
        <p className="v-hint">Loading…</p>
      ) : members.length === 0 ? (
        <p className="v-hint">No members yet.</p>
      ) : (
        <div>
          {members.map((m) => (
            <div key={m.userId} className="ax-row">
              <div className="ax-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : monogram(m.username ?? "?")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ax-name">@{m.username ?? "—"}</div>
                <div className="ax-sub">{m.projectCount} project{m.projectCount !== 1 ? "s" : ""} · joined {relativeTime(m.createdAt)}</div>
              </div>
              {confirm === m.userId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span className="v-error" style={{ fontSize: 12 }}>Delete all data?</span>
                  <button onClick={() => handleDelete(m.userId)} disabled={!!deleting} className="v-btn v-btn-sm v-btn-danger">
                    {deleting === m.userId ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={() => setConfirm(null)} className="v-btn v-btn-sm v-btn-quiet">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirm(m.userId)} className="v-icon-btn is-danger" aria-label={`Delete @${m.username ?? "member"}`} title="Delete member"><ITrash /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Dashboard ── */
function Dashboard({ pinToken, onForbidden }: { pinToken?: string; onForbidden: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (pinToken) headers["x-admin-pin"] = pinToken;
    fetch("/api/admin/stats", { headers, credentials: "include" })
      .then(async (r) => {
        if (r.status === 403) { onForbidden(); return; }
        if (!r.ok) { setError("Failed to load analytics."); return; }
        setStats(await r.json());
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [pinToken, onForbidden]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "80px 0" }}>
      <div className="px-spinner" />
      <span className="v-mono" style={{ color: "var(--v-signal)" }}>Loading analytics…</span>
    </div>
  );

  if (error) return <div style={{ padding: "80px 0", textAlign: "center" }}><p className="v-error" style={{ fontSize: 14 }}>{error}</p></div>;

  if (!stats) return null;

  const rate = stats.acknowledgedRate;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="v-stats v-hud ax-stats">
        {([
          [pad(stats.totalProfiles), "Members", undefined],
          [pad(stats.totalProjects), "Projects", undefined],
          [pad(stats.totalComments), "Comments", undefined],
          [`${rate}%`, "Acknowledged", `${stats.acknowledgedComments} of ${stats.totalComments}`],
        ] as const).map(([value, label, sub]) => (
          <div key={label} className="v-stat">
            <div className="v-stat-num">{value}</div>
            <div className="v-mono v-stat-label">{label}</div>
            {sub && <div className="v-hint" style={{ marginTop: 4 }}>{sub}</div>}
          </div>
        ))}
      </div>

      <section className="ax-panel">
        <SectionHead>Projects by status</SectionHead>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {stats.projectsByStatus.map((s) => {
            const c = STATUS_COLOR[s.status.toLowerCase()] ?? "var(--v-c1)";
            return (
              <span key={s.status} className="v-status" style={{ color: `color-mix(in oklab, ${c} 55%, transparent)`, height: 30, padding: "0 12px" }}>
                <span className="v-led" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                <span>{s.status}</span>
                <span style={{ color: "var(--v-text)", fontWeight: 600 }}>{s._count.id}</span>
              </span>
            );
          })}
        </div>
      </section>

      <div className="ax-two">
        <section className="ax-panel">
          <SectionHead>Most commented</SectionHead>
          {stats.topCommentedProjects.length === 0 ? (
            <p className="v-hint">No comments yet.</p>
          ) : stats.topCommentedProjects.map((p, i) => (
            <div key={p.projectId} className="ax-row">
              <span className="ax-rank">{pad(i + 1)}</span>
              <span className="ax-name" style={{ flex: 1 }}>{p.title}</span>
              <span className="v-chip" style={{ paddingRight: 10 }}>{p.count}</span>
            </div>
          ))}
        </section>

        <section className="ax-panel">
          <SectionHead>Review response rate</SectionHead>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" width={104} height={104} style={{ transform: "rotate(-90deg)" }}>
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" style={{ stroke: "rgba(var(--v-ink-rgb),0.12)" }} />
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={`${rate} ${100 - rate}`} style={{ stroke: "var(--v-live)", filter: "drop-shadow(0 0 3px var(--v-live))" }} />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <span className="v-display" style={{ fontSize: 20, color: "var(--v-live)" }}>{rate}%</span>
              </div>
            </div>
            <div>
              <p style={{ color: "var(--v-muted)" }}><b style={{ color: "var(--v-live)" }}>{stats.acknowledgedComments}</b> acknowledged</p>
              <p style={{ color: "var(--v-muted)", marginTop: 6 }}><b style={{ color: "var(--v-text)" }}>{stats.totalComments - stats.acknowledgedComments}</b> pending</p>
            </div>
          </div>
        </section>
      </div>

      <section className="ax-panel">
        <SectionHead>Project views</SectionHead>
        {stats.topViewedProjects.length === 0 ? (
          <p className="v-hint">No views recorded yet.</p>
        ) : stats.topViewedProjects.map((p, i) => (
          <div key={p.projectId} className="ax-row">
            <span className="ax-rank">{pad(i + 1)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ax-name">{p.title}</div>
              <div className="ax-sub" style={{ color: "var(--v-signal)" }}>@{p.ownerUsername}</div>
            </div>
            <span className="v-display" style={{ fontSize: 18 }}>{p.totalViews}</span>
          </div>
        ))}

        {stats.recentViews.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--v-line)" }}>
            <p className="v-mono" style={{ color: "var(--v-faint)", marginBottom: 6 }}>Recent activity</p>
            {stats.recentViews.slice(0, 8).map((v, i) => (
              <div key={i} className="ax-row">
                <div className="ax-av" style={v.isGuest ? { background: "rgba(var(--v-ink-rgb),0.1)", color: "var(--v-muted)" } : undefined}>{v.viewerName.charAt(0).toUpperCase()}</div>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--v-muted)" }}>
                  <span style={{ color: v.isGuest ? "var(--v-faint)" : "var(--v-text)" }}>{v.isGuest ? "Guest" : `@${v.viewerName}`}</span>
                  {" "}viewed <b style={{ color: "var(--v-text)", fontWeight: 500 }}>{v.projectTitle}</b> by <span style={{ color: "var(--v-signal)" }}>@{v.ownerUsername}</span>
                </span>
                <span className="ax-sub" style={{ flexShrink: 0, marginTop: 0 }}>{relativeTime(v.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <MembersSection pinToken={pinToken} />

      <section className="ax-panel">
        <SectionHead>Recent comments</SectionHead>
        {stats.recentComments.length === 0 ? (
          <p className="v-hint">No comments yet.</p>
        ) : stats.recentComments.map((c) => (
          <div key={c.id} className="ax-row" style={{ alignItems: "flex-start" }}>
            <div className="ax-av">{c.authorName.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span className="ax-name">{c.authorName}</span>
                <span className="ax-sub" style={{ marginTop: 0 }}>on</span>
                <span style={{ fontSize: 13, color: "var(--v-signal)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.projectTitle}</span>
                <span className="ax-sub" style={{ marginLeft: "auto", marginTop: 0 }}>{relativeTime(c.createdAt)}</span>
              </div>
              <p style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: "var(--v-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.body}</p>
            </div>
            {c.acknowledged && (
              <span className="v-status is-live" style={{ flexShrink: 0 }}><span className="v-led" /><span>Noted</span></span>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ── Main page ── */
export default function AdminPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [pinToken, setPinToken] = useState<string | null>(() => {
    try { return sessionStorage.getItem("admin-pin-token"); } catch { return null; }
  });
  const [showPin, setShowPin] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const year = new Date().getFullYear();

  function handlePinVerified(token: string) {
    try { sessionStorage.setItem("admin-pin-token", token); } catch {}
    setPinToken(token);
    setForbidden(false);
  }

  function handleSignOut() {
    try { sessionStorage.removeItem("admin-pin-token"); } catch {}
    setPinToken(null);
    setForbidden(false);
    setShowPin(false);
  }

  function handleForbidden() {
    handleSignOut();
    setForbidden(true);
  }

  const isAuthenticated = (isLoaded && isSignedIn) || !!pinToken;

  return (
    <div className="vault">
      <style>{AX_CSS}</style>
      <div className="v-atmos" />
      <div className="v-noise" />

      <nav className="v-nav">
        <div className="v-wrap v-nav-inner">
          <Link href="/landing" className="v-brand" aria-label="Project Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Project Locker</span>
            <span className="v-brand-path">/ admin</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemePicker />
            <Link href="/landing" className="v-btn v-btn-sm v-btn-quiet"><IArrowLeft /> <span className="v-hide-xs">Back</span></Link>
            {isAuthenticated && <button onClick={handleSignOut} className="v-btn v-btn-sm">Sign out</button>}
          </div>
        </div>
      </nav>

      <main className="v-main v-wrap" style={{ paddingTop: 40 }}>
        <div className="v-section-head" style={{ marginTop: 0 }}>
          <div>
            <span className="v-eyebrow">Control room</span>
            <h1 className="v-section-title">Admin <span className="v-grad-text">analytics</span></h1>
          </div>
        </div>

        {!isAuthenticated ? (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            {forbidden && <div className="ax-alert">Access denied. Sign in as the admin account or enter the admin PIN.</div>}
            <div className="ax-gate v-hud" style={{ marginTop: forbidden ? 0 : 24 }}>
              <div className="ax-lock"><ILock /></div>
              <h2 className="v-dialog-title" style={{ fontSize: 24 }}>Admin access</h2>
              <p style={{ color: "var(--v-muted)", marginTop: 8 }}>Sign in or enter your admin PIN</p>

              <SignInButton mode="modal">
                <button className="v-btn v-btn-lg v-btn-primary" style={{ width: "100%", marginTop: 24 }}>Sign in as admin</button>
              </SignInButton>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                <span style={{ flex: 1, height: 1, background: "var(--v-line)" }} />
                <span className="v-mono" style={{ color: "var(--v-faint)" }}>or</span>
                <span style={{ flex: 1, height: 1, background: "var(--v-line)" }} />
              </div>

              {!showPin ? (
                <button onClick={() => setShowPin(true)} className="v-btn v-btn-lg" style={{ width: "100%" }}>Enter admin PIN</button>
              ) : (
                <PinGate onVerified={handlePinVerified} />
              )}
            </div>
          </div>
        ) : (
          <Dashboard pinToken={pinToken ?? undefined} onForbidden={handleForbidden} />
        )}
      </main>

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
