"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Cover from "@/components/Cover";
import StatusBadge from "@/components/StatusBadge";
import ThemePicker from "@/components/ThemePicker";
import { useT } from "@/lib/i18n";
import type { ProjectStatus } from "@/types/project";
import { IArrowUpRight, ICamera, ICopy, IEye, ILock, IPlus, LockerMark } from "@/components/icons";


const DEMO: { name: string; stack: string; status: ProjectStatus }[] = [
  { name: "e-Sekolah Hub", stack: "Next.js / Neon", status: "Live" },
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
  const t = useT();
  const words = t("lx.words").split("|");

  useRevealAll(rootRef);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setWordOut(true);
      timer = setTimeout(() => { setWordIdx((i) => i + 1); setWordOut(false); }, 380);
    }, 2800);
    return () => { clearInterval(id); clearTimeout(timer); };
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
          <Link href="/landing" className="v-brand" aria-label="Project Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Project Locker</span>
          </Link>
          <div className="lx-nav-links">
            <a href="#features">{t("nav.features")}</a>
            <a href="#how">{t("nav.how")}</a>
            <a href="#start">{t("nav.start")}</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemePicker />
            <Link href="/" className="v-btn v-btn-sm v-btn-primary">{t("nav.enterApp")} <IArrowUpRight /></Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lx-hero" onMouseMove={tilt}>
        <div className="v-floor" />
        <div className="lx-hud-corner" style={{ top: 28, left: "clamp(16px, 4vw, 40px)" }}>
          SYS://PROJECT-LOCKER v2.0<br />STATUS <b>● ONLINE</b>
        </div>
        <div className="lx-hud-corner" style={{ top: 28, right: "clamp(16px, 4vw, 40px)", textAlign: "right" }}>
          PERSONAL APP INDEX<br />LOCAL <b><Clock /></b>
        </div>

        <div className="v-wrap" style={{ position: "relative", zIndex: 2, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span className="v-eyebrow v-rise">{t("lx.eyebrow")}</span>
          </div>
          <h1 className="lx-title" style={{ marginTop: 22 }}>
            <span className="v-line" style={{ animationDelay: "80ms" }}>{t("lx.l1")}</span>
            <span className="v-line" style={{ animationDelay: "200ms" }}>
              {t("lx.l2")}{" "}
              <span className={`lx-word v-grad-text ${wordOut ? "is-out" : "is-in"}`} key={wordIdx} style={{ filter: "drop-shadow(0 0 30px rgba(var(--v-c2-rgb),0.45))" }}>
                {words[wordIdx % words.length]}
              </span>
            </span>
          </h1>
          <p className="lx-sub v-rise" style={{ animationDelay: "320ms" }}>{t("lx.sub")}</p>
          <div className="lx-ctas v-rise" style={{ animationDelay: "420ms" }}>
            <Link href="/" className="v-btn v-btn-lg v-btn-primary">{t("lx.enter")} <IArrowUpRight /></Link>
            <a href="#features" className="v-btn v-btn-lg">{t("lx.inside")}</a>
          </div>

          <div className="lx-stage v-rise" ref={stageRef} style={{ animationDelay: "560ms" }}>
            <div className="lx-window">
              <div className="lx-window-bar">
                <div className="lx-dots"><i /><i /><i /></div>
                <div className="lx-url">locker / nurazwann</div>
                <span className="v-mono" style={{ fontSize: 10, color: "var(--v-signal)" }}>{t("lx.entries", { n: "06" })}</span>
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
              { n: 100, s: "%", l: t("lx.stat1"), c: "var(--v-c1)" },
              { n: 2, s: t("lx.stat2s"), l: t("lx.stat2"), c: "var(--v-c2)" },
              { n: 3, s: t("lx.stat3s"), l: t("lx.stat3"), c: "var(--v-c3)" },
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
          <span className="v-eyebrow lx-reveal">{t("lx.capEyebrow")}</span>
          <h2 className="lx-h2 lx-reveal">{t("lx.capTitle")} <span className="v-grad-text">{t("lx.capTitleEm")}</span></h2>
          <p className="lx-lead lx-reveal">{t("lx.capLead")}</p>

          <div className="lx-bento">
            <Feature wide delay={0} accent="var(--v-c1)" icon={<IPlus />} title={t("lx.f1")} desc={t("lx.f1d")}>
              <div className="lx-feat-demo">
                {DEMO.slice(0, 3).map((d, i) => (
                  <div key={d.name} className="lx-demo-row">
                    <span>№{String(i + 1).padStart(3, "0")} · {d.name}</span>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </Feature>
            <Feature delay={80} accent="var(--v-c3)" icon={<IArrowUpRight />} title={t("lx.f2")} desc={t("lx.f2d")} />
            <Feature delay={0} accent="var(--v-live)" icon={<IPulse />} title={t("lx.f3")} desc={t("lx.f3d")} />
            <Feature delay={80} accent="var(--v-amber)" icon={<ICamera />} title={t("lx.f4")} desc={t("lx.f4d")} />
            <Feature delay={160} accent="var(--v-c2)" icon={<ILock />} title={t("lx.f5")} desc={t("lx.f5d")} />
            <Feature full delay={0} accent="var(--v-c1)" icon={<IEye />} title={t("lx.f6")} desc={t("lx.f6d")}>
              <div className="lx-feat-demo">
                <div className="lx-demo-row">
                  <span><span style={{ color: "var(--v-faint)" }}>https://</span>projectlocker.app/s/<span style={{ color: "var(--v-signal)" }}>9fK2qX…</span></span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--v-text)" }}><ICopy style={{ width: 13, height: 13 }} /> {t("lx.copy").toUpperCase()}</span>
                </div>
              </div>
            </Feature>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="lx-section" id="how">
          <span className="v-eyebrow lx-reveal">{t("lx.protoEyebrow")}</span>
          <h2 className="lx-h2 lx-reveal">{t("lx.protoTitle")} <span className="v-grad-text">{t("lx.protoTitleEm")}</span></h2>
          <div className="lx-steps">
            {[
              { title: t("lx.st1"), d: t("lx.st1d") },
              { title: t("lx.st2"), d: t("lx.st2d") },
              { title: t("lx.st3"), d: t("lx.st3d") },
            ].map((s, i) => (
              <div key={i} className="lx-step lx-reveal" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="lx-step-node">0{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lx-cta v-hud lx-reveal" id="start">
          <div className="v-floor" />
          <span className="v-eyebrow" style={{ position: "relative" }}>{t("lx.ctaEyebrow")}</span>
          <h2 className="lx-cta-title" style={{ marginTop: 20 }}>
            {t("lx.ctaL1")}<br /><span className="v-grad-text">{t("lx.ctaL2")}</span>
          </h2>
          <p className="lx-sub" style={{ position: "relative" }}>{t("lx.ctaSub")}</p>
          <div className="lx-ctas" style={{ position: "relative" }}>
            <Link href="/" className="v-btn v-btn-lg v-btn-primary">{t("lx.enter")} <IArrowUpRight /></Link>
          </div>
        </section>
      </main>

      <footer className="v-footer">
        <div className="v-wrap"><div className="v-footer-mark" aria-hidden>AZWANN ANIS</div></div>
        <div className="v-wrap v-footer-inner">
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>© {year} Nurazwann bin Ismail · Azwann Anis</span>
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>{t("common.rights")}</span>
        </div>
      </footer>
    </div>
  );
}
