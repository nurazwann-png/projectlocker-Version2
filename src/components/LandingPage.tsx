"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Cover from "@/components/Cover";
import StatusBadge from "@/components/StatusBadge";
import ThemePicker from "@/components/ThemePicker";
import type { ProjectStatus } from "@/types/project";
import { IArrowUpRight, ICamera, ICopy, IEye, ILock, IPlus, LockerMark } from "@/components/icons";

const WORDS = ["one place.", "the vault.", "orbit.", "the spotlight."];

const DEMO: { name: string; stack: string; status: ProjectStatus }[] = [
  { name: "PRESTIJ Hub", stack: "Next.js / Neon", status: "Live" },
  { name: "Kehadiran Guru", stack: "Laravel / MySQL", status: "Live" },
  { name: "eRPH Generator", stack: "FastAPI / React", status: "Maintenance" },
  { name: "Laporan Prestasi", stack: "Next.js / Sheets", status: "Live" },
  { name: "Bilik Darjah", stack: "Vue / Firebase", status: "Deprecated" },
  { name: "Portal Murid", stack: "Svelte / Supabase", status: "Live" },
];

const STACK = ["Next.js", "TypeScript", "Laravel", "Python", "React", "Tailwind", "Postgres", "Prisma", "Firebase", "Vue", "FastAPI", "Docker", "Supabase", "Node.js"];

const IPulse = (p: React.SVGProps<SVGSVGElement>) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);

function useRevealAll(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".lx-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

function useInView<T extends HTMLElement>(threshold = 0.4) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function CountUp({ to, active, suffix = "" }: { to: number; active: boolean; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, active]);
  return <>{n}{suffix}</>;
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{now ?? "--:--:--"}</>;
}

function Feature({ accent, icon, title, desc, wide, full, delay, children }: {
  accent: string; icon: ReactNode; title: string; desc: string; wide?: boolean; full?: boolean; delay: number; children?: ReactNode;
}) {
  return (
    <article
      className={`lx-feat lx-reveal${wide ? " is-wide" : ""}${full ? " is-full" : ""}`}
      style={{ "--accent": accent, transitionDelay: `${delay}ms` } as CSSProperties}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      <div className="lx-feat-icon" style={full ? { gridRow: "1 / span 2" } : undefined}>{icon}</div>
      {!full && children}
      <h3>{title}</h3>
      <p style={full ? { marginTop: 0 } : undefined}>{desc}</p>
      {full && children}
    </article>
  );
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [wordOut, setWordOut] = useState(false);
  const stats = useInView<HTMLDivElement>(0.35);
  const year = new Date().getFullYear();

  useRevealAll(rootRef);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setWordOut(true);
      t = setTimeout(() => { setWordIdx((i) => (i + 1) % WORDS.length); setWordOut(false); }, 380);
    }, 2800);
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);

  // Scroll: progress bar + the app window "unfolds" from tilted to flat
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
        const rx = Math.max(0, 16 - window.scrollY / 28);
        stageRef.current?.style.setProperty("--rx", `${rx}deg`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  function tilt(e: React.MouseEvent<HTMLElement>) {
    const el = stageRef.current;
    if (!el) return;
    const x = e.clientX / window.innerWidth - 0.5;
    el.style.setProperty("--ry", `${x * 8}deg`);
  }

  return (
    <div className="vault" ref={rootRef}>
      <div className="v-atmos" />
      <div className="v-noise" />

      {/* ── Nav ── */}
      <nav className="v-nav">
        <div className="lx-progress" style={{ width: `${progress}%` }} />
        <div className="v-wrap v-nav-inner">
          <Link href="/landing" className="v-brand" aria-label="Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Locker</span>
          </Link>
          <div className="lx-nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#start">Get started</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemePicker />
            <Link href="/" className="v-btn v-btn-sm v-btn-primary">Enter app <IArrowUpRight /></Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lx-hero" onMouseMove={tilt}>
        <div className="v-floor" />
        <div className="lx-hud-corner" style={{ top: 28, left: "clamp(16px, 4vw, 40px)" }}>
          SYS://LOCKER v2.0<br />STATUS <b>● ONLINE</b>
        </div>
        <div className="lx-hud-corner" style={{ top: 28, right: "clamp(16px, 4vw, 40px)", textAlign: "right" }}>
          PPD DALAT · SARAWAK<br />LOCAL <b><Clock /></b>
        </div>

        <div className="v-wrap" style={{ position: "relative", zIndex: 2, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span className="v-eyebrow v-rise">Personal app locker</span>
          </div>
          <h1 className="lx-title" style={{ marginTop: 22 }}>
            <span className="v-line" style={{ animationDelay: "80ms" }}>Every app you ship,</span>
            <span className="v-line" style={{ animationDelay: "200ms" }}>
              kept in{" "}
              <span className={`lx-word v-grad-text ${wordOut ? "is-out" : "is-in"}`} key={wordIdx} style={{ filter: "drop-shadow(0 0 30px rgba(var(--v-c2-rgb),0.45))" }}>
                {WORDS[wordIdx]}
              </span>
            </span>
          </h1>
          <p className="lx-sub v-rise" style={{ animationDelay: "320ms" }}>
            Log, organise and showcase everything you&apos;ve built — live links, repos, tech stacks
            and screenshots, in one luminous index.
          </p>
          <div className="lx-ctas v-rise" style={{ animationDelay: "420ms" }}>
            <Link href="/" className="v-btn v-btn-lg v-btn-primary">Enter the locker <IArrowUpRight /></Link>
            <a href="#features" className="v-btn v-btn-lg">See what&apos;s inside</a>
          </div>

          <div className="lx-stage v-rise" ref={stageRef} style={{ animationDelay: "560ms" }}>
            <div className="lx-window">
              <div className="lx-window-bar">
                <div className="lx-dots"><i /><i /><i /></div>
                <div className="lx-url">locker / nurazwann</div>
                <span className="v-mono" style={{ fontSize: 10, color: "var(--v-signal)" }}>06 ENTRIES</span>
              </div>
              <div className="lx-window-body">
                {DEMO.map((d, i) => (
                  <div key={d.name} className="lx-mini">
                    <div className="lx-mini-media"><Cover name={d.name} showCode={false} /></div>
                    <div className="lx-mini-body">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span className="v-card-no">№{String(i + 1).padStart(3, "0")}</span>
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="lx-mini-title">{d.name}</div>
                      <div className="lx-mini-stack">{d.stack}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lx-stage-glow" />
          </div>
        </div>
      </header>

      {/* ── Marquee ── */}
      <div className="lx-marquee" aria-hidden>
        <div className="lx-marquee-track">
          {[...STACK, ...STACK].map((s, i) => <span key={i}>{s}</span>)}
        </div>
      </div>

      <main className="v-main v-wrap">
        {/* ── Stats ── */}
        <section className="lx-section" style={{ paddingTop: "clamp(72px, 9vw, 110px)" }}>
          <div className="lx-stats" ref={stats.ref}>
            {[
              { n: 100, s: "%", l: "Yours. Private by default.", c: "var(--v-c1)" },
              { n: 2, s: " min", l: "To log your first app", c: "var(--v-c2)" },
              { n: 3, s: " views", l: "Grid · list · timeline", c: "var(--v-c3)" },
            ].map((x, i) => (
              <div key={x.l} className="lx-stat v-hud lx-reveal" style={{ "--hud": x.c, transitionDelay: `${i * 100}ms` } as CSSProperties}>
                <div className="lx-stat-num" style={{ color: x.c, textShadow: `0 0 40px color-mix(in oklab, ${x.c} 50%, transparent)` }}><CountUp to={x.n} active={stats.inView} suffix={x.s} /></div>
                <div className="v-mono lx-stat-label">{x.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="lx-section" id="features">
          <span className="v-eyebrow lx-reveal">Capabilities</span>
          <h2 className="lx-h2 lx-reveal">Built for people who <span className="v-grad-text">ship things.</span></h2>
          <p className="lx-lead lx-reveal">Everything you need to keep a living record of your work — and show it off.</p>

          <div className="lx-bento">
            <Feature wide delay={0} accent="var(--v-c1)" icon={<IPlus />} title="Log every app" desc="Name, story, deploy date, stack and screenshots — each project gets a permanent entry number in your index.">
              <div className="lx-feat-demo">
                {DEMO.slice(0, 3).map((d, i) => (
                  <div key={d.name} className="lx-demo-row">
                    <span>№{String(i + 1).padStart(3, "0")} · {d.name}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </Feature>
            <Feature delay={80} accent="var(--v-c3)" icon={<IArrowUpRight />} title="Live links & repos" desc="One click to visit the deployed app or review its source." />
            <Feature delay={0} accent="var(--v-live)" icon={<IPulse />} title="Status at a glance" desc="Live, Maintenance or Deprecated — with a health score that ages honestly." />
            <Feature delay={80} accent="var(--v-amber)" icon={<ICamera />} title="Covers & screenshots" desc="Upload a screenshot or let Locker generate a neon cover for you." />
            <Feature delay={160} accent="var(--v-c2)" icon={<ILock />} title="PIN-locked notes" desc="A private dev journal per app — learnings, issues, ideas — behind a 4-digit PIN." />
            <Feature full delay={0} accent="var(--v-c1)" icon={<IEye />} title="A public portfolio" desc="Share your /u/username page — a read-only gallery of everything you've shipped, with view counts.">
              <div className="lx-feat-demo">
                <div className="lx-demo-row">
                  <span><span style={{ color: "var(--v-faint)" }}>https://</span>locker.app/u/<span style={{ color: "var(--v-signal)" }}>nurazwann</span></span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--v-text)" }}><ICopy style={{ width: 13, height: 13 }} /> COPY</span>
                </div>
              </div>
            </Feature>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lx-section" id="how">
          <span className="v-eyebrow lx-reveal">Protocol</span>
          <h2 className="lx-h2 lx-reveal">Three steps to a <span className="v-grad-text">full locker.</span></h2>
          <div className="lx-steps">
            {[
              { t: "Open the locker", d: "Jump straight in. Your index is ready the moment you arrive." },
              { t: "Log your apps", d: "Add each app with its URL, repo, stack and a screenshot." },
              { t: "Share the link", d: "Send your /u/username page and let the work speak." },
            ].map((s, i) => (
              <div key={s.t} className="lx-step lx-reveal" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="lx-step-node">0{i + 1}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lx-cta v-hud lx-reveal" id="start">
          <div className="v-floor" />
          <span className="v-eyebrow" style={{ position: "relative" }}>Ready when you are</span>
          <h2 className="lx-cta-title" style={{ marginTop: 20 }}>
            Start locking<br /><span className="v-grad-text">your apps.</span>
          </h2>
          <p className="lx-sub" style={{ position: "relative" }}>Never lose track of what you&apos;ve built again.</p>
          <div className="lx-ctas" style={{ position: "relative" }}>
            <Link href="/" className="v-btn v-btn-lg v-btn-primary">Enter the locker <IArrowUpRight /></Link>
          </div>
        </section>
      </main>

      <footer className="v-footer">
        <div className="v-wrap"><div className="v-footer-mark" aria-hidden>LOCKER</div></div>
        <div className="v-wrap v-footer-inner">
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>© {year} Nurazwann bin Ismail · Pejabat Pendidikan Daerah Dalat</span>
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>All rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
