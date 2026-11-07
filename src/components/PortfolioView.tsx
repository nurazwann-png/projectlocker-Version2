"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Project, ProjectStatus } from "@/types/project";
import type { ProfileData, ProfileLinks } from "@/hooks/useProfile";
import ProjectCard from "./ProjectCard";
import ProjectDetailModal from "./ProjectDetailModal";
import SearchBar, { type SortOption } from "./SearchBar";
import TagCloud from "./TagCloud";
import TimelineView from "./TimelineView";
import StatusBadge from "./StatusBadge";
import Cover from "./Cover";
import ThemePicker from "./ThemePicker";
import { useT, type TKey } from "@/lib/i18n";
import { formatDate, monogram, pad } from "@/lib/projectMeta";
import { IArrowUpRight, IEye, IGithub, ILock, LockerMark } from "./icons";

type ViewMode = "grid" | "list" | "timeline";

export interface PortfolioData {
  profile: ProfileData;
  projects: Project[];
  displayName: string | null;
  handle: string | null;
  ownerId?: string;
  viewerIsAdmin?: boolean;
  preferredView: ViewMode;
}

export type PortfolioState =
  | { kind: "loading" }
  | { kind: "message"; title: TKey; sub: TKey; code?: string }
  | { kind: "ready"; data: PortfolioData };

/** Turns API rows into the shapes the UI uses. */
export function toPortfolio(p: Record<string, unknown>, rows: unknown, extra: Partial<PortfolioData> = {}): PortfolioData {
  const projects: Project[] = Array.isArray(rows) ? rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: (r.title as string) ?? "",
    description: (r.description as string) ?? "",
    liveUrl: (r.liveUrl as string) ?? "",
    repoUrl: "",
    techStack: Array.isArray(r.techStack) ? (r.techStack as string[]) : [],
    deploymentDate: (r.deploymentDate as string) ?? "",
    status: (r.status as Project["status"]) ?? "Live",
    thumbnail: (r.coverImage as string | null) ?? null,
    notes: (r.notes as string) ?? "",
    notesLocked: Boolean(r.notesLocked),
    features: [],
    pinned: Boolean(r.pinned),
    createdAt: (r.createdAt as string) ?? "",
    updatedAt: (r.updatedAt as string) ?? "",
  })) : [];
  return {
    profile: {
      bio: (p.bio as string) ?? "",
      cover: (p.coverUrl as string) ?? null,
      coverPosition: p.coverPosition ? JSON.parse(p.coverPosition as string) : { x: 50, y: 50, scale: 1 },
      avatar: (p.avatarUrl as string) ?? null,
      links: (p.links as ProfileLinks) ?? {},
      skills: (p.skills as string[]) ?? [],
      username: (p.username as string) ?? null,
    },
    projects,
    displayName: (p.displayName as string) ?? null,
    handle: (p.username as string) ?? null,
    preferredView: ((p.preferredView as ViewMode) ?? "grid"),
    ...extra,
  };
}

function Shell({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="vault">
      <div className="v-atmos" />
      <div className="v-noise" />
      <nav className="v-nav">
        <div className="v-wrap v-nav-inner">
          <Link href="/landing" className="v-brand" aria-label="Project Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Project Locker</span>
            <span className="v-brand-path">{path}</span>
          </Link>
          <ThemePicker />
        </div>
      </nav>
      {children}
    </div>
  );
}

export default function PortfolioView({ state, path, banner, viewerId, onView }: {
  state: PortfolioState;
  path: string;
  banner: "owner" | "shared";
  viewerId?: string | null;
  onView?: (projectId: string) => void;
}) {
  const t = useT();
  if (state.kind === "loading") return (
    <Shell path={path}>
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="px-spinner" />
          <span className="v-mono" style={{ color: "var(--v-signal)" }}>{t("px.loading")}</span>
        </div>
      </div>
    </Shell>
  );

  if (state.kind === "message") return (
    <Shell path={path}>
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", position: "relative", zIndex: 1, textAlign: "center", padding: 24 }}>
        <div className="v-dialog v-hud" style={{ animation: "none", width: "min(440px, 100%)" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto", display: "grid", placeItems: "center", borderRadius: 16, color: "var(--v-signal)", background: "rgba(var(--v-c1-rgb),0.1)", border: "1px solid rgba(var(--v-c1-rgb),0.35)" }}>
            <ILock style={{ width: 24, height: 24 }} />
          </div>
          <h1 className="v-dialog-title" style={{ marginTop: 18 }}>{t(state.title)}</h1>
          <p style={{ color: "var(--v-muted)", marginTop: 10, lineHeight: 1.6 }}>{t(state.sub)}</p>
          <Link href="/landing" className="v-btn" style={{ marginTop: 22 }}>{t("px.makeOwn").replace(" →", "")} <IArrowUpRight /></Link>
        </div>
      </div>
    </Shell>
  );

  return <Ready data={state.data} path={path} banner={banner} viewerId={viewerId} onView={onView} />;
}

function Ready({ data, path, banner, viewerId, onView }: {
  data: PortfolioData; path: string; banner: "owner" | "shared"; viewerId?: string | null; onView?: (id: string) => void;
}) {
  const t = useT();
  const { profile, projects } = data;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const viewMode = data.preferredView;

  const filtered = useMemo(() => {
    let list = [...projects];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (tagFilter) list = list.filter((p) => p.techStack.includes(tagFilter));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.techStack.some((x) => x.toLowerCase().includes(q)));
    }
    if (sort === "oldest") list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    else if (sort === "az") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "status") list.sort((a, b) => a.status.localeCompare(b.status));
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return list;
  }, [projects, query, sort, tagFilter, statusFilter]);

  const entryNo = useMemo(() => {
    const m = new Map<string, number>();
    [...projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [projects]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { "": projects.length, Live: 0, Maintenance: 0, Deprecated: 0 };
    for (const p of projects) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [projects]);

  const techCount = useMemo(() => new Set(projects.flatMap((p) => p.techStack)).size, [projects]);
  const name = data.displayName || (data.handle ? `@${data.handle}` : "Portfolio");
  const year = new Date().getFullYear();

  const links = [
    profile.links.github && { href: profile.links.github, label: "GitHub", icon: <IGithub /> },
    profile.links.linkedin && { href: profile.links.linkedin, label: "LinkedIn", icon: <IArrowUpRight /> },
    profile.links.website && { href: profile.links.website, label: t("pe.website"), icon: <IArrowUpRight /> },
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode }[];

  return (
    <Shell path={path}>
      <div className="v-main" style={{ borderBottom: "1px solid var(--v-line)", background: "rgba(var(--v-c1-rgb),0.05)" }}>
        <div className="v-wrap px-banner">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <IEye style={{ width: 13, height: 13, color: "var(--v-signal)", flexShrink: 0 }} />
            {banner === "owner" ? t("px.ownerPreview") : <>{t("px.shared")} · {t("px.readOnly")}</>}
          </span>
        </div>
      </div>

      <header className="px-hero v-main">
        {profile.cover ? (
          <div className="px-cover"><img src={profile.cover} alt="" /></div>
        ) : (
          <div className="v-floor" style={{ height: "70%", opacity: 0.4 }} />
        )}
        <div className="v-wrap px-hero-inner">
          <div className="px-avatar v-rise">
            {profile.avatar ? <img src={profile.avatar} alt="" /> : <div><span className="v-grad-text">{monogram(name.replace("@", ""))}</span></div>}
          </div>
          <div className="v-rise" style={{ animationDelay: "120ms", minWidth: 0 }}>
            <span className="v-eyebrow">{t("px.eyebrow", { year })}</span>
            <h1 className="px-name">{name}</h1>
            {data.displayName && data.handle && <div className="v-mono" style={{ marginTop: 8, color: "var(--v-faint)" }}>@{data.handle}</div>}
            {profile.bio && <p className="px-bio">{profile.bio}</p>}
            {links.length > 0 && (
              <div className="px-links">
                {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="v-btn v-btn-sm">{l.icon} {l.label}</a>)}
              </div>
            )}
          </div>
          <div className="px-stats v-hud v-rise" style={{ animationDelay: "220ms" }}>
            {([[projects.length, "stat.projects"], [techCount, "stat.tech"], [statusCounts.Live, "stat.live"]] as const).map(([n, label]) => (
              <div key={label} className="v-stat">
                <div className="v-stat-num">{pad(n)}</div>
                <div className="v-mono v-stat-label">{t(label)}</div>
              </div>
            ))}
          </div>
        </div>
        {profile.skills.length > 0 && (
          <div className="v-wrap" style={{ position: "relative", zIndex: 1, paddingBottom: 28 }}>
            <div className="v-tags" style={{ marginBottom: 0 }}>
              <span className="v-mono v-tags-label" style={{ color: "var(--v-faint)" }}>{t("px.skills")}</span>
              {profile.skills.map((s) => <span key={s} className="v-tag is-static">{s}</span>)}
            </div>
          </div>
        )}
      </header>

      <main className="v-main v-wrap">
        <div className="v-section-head" style={{ marginTop: 48 }}>
          <div>
            <span className="v-eyebrow">{t("px.shipped")}</span>
            <h2 className="v-section-title">{t("px.work")}{projects.length > 0 && <sup>{pad(filtered.length)}/{pad(projects.length)}</sup>}</h2>
          </div>
        </div>

        {projects.length > 0 && (
          <SearchBar query={query} onQueryChange={setQuery} statusFilter={statusFilter} onStatusChange={setStatusFilter} sort={sort} onSortChange={setSort} counts={statusCounts} />
        )}
        {projects.length > 0 && <TagCloud projects={projects} activeTag={tagFilter} onTagClick={(x) => setTagFilter(x === tagFilter ? "" : x)} />}

        {filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <p className="v-display" style={{ fontSize: 28 }}>{query || tagFilter || statusFilter ? <>{t("empty.noMatch")} <span className="v-grad-text">{t("empty.noMatchEm")}</span></> : <>{t("px.noProjects")} <span className="v-grad-text">{t("px.noProjectsEm")}</span></>}</p>
            <p style={{ color: "var(--v-muted)", marginTop: 12 }}>{query || tagFilter || statusFilter ? t("empty.noMatchSub") : t("px.noProjectsSub")}</p>
          </div>
        ) : viewMode === "timeline" ? (
          <TimelineView projects={filtered} onCardClick={setDetailProject} onEdit={() => {}} />
        ) : viewMode === "list" ? (
          <div className="v-list" role="list">
            {filtered.map((project, i) => (
              <div key={project.id} role="listitem" tabIndex={0} className="v-row" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                onClick={() => setDetailProject(project)} onKeyDown={(e) => { if (e.key === "Enter") setDetailProject(project); }}>
                <span className="v-card-no hide-sm">№{pad(entryNo.get(project.id) ?? i + 1, 3)}</span>
                <div className="v-row-thumb"><Cover name={project.name} src={project.thumbnail} liveUrl={project.liveUrl} showCode={false} /></div>
                <div className="v-row-name">{project.name}</div>
                <div className="v-row-stack hide-sm">{project.techStack.join("  /  ") || "—"}</div>
                <div><StatusBadge status={project.status} /></div>
                <div className="v-row-date hide-sm">{formatDate(project.deploymentDate)}</div>
                <div className="hide-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="v-grid">
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                number={entryNo.get(project.id)}
                onEdit={() => {}}
                onDelete={() => {}}
                onCardClick={setDetailProject}
                onTagClick={(x) => setTagFilter(x === tagFilter ? "" : x)}
                activeTagFilter={tagFilter}
                onView={onView}
                readOnly
              />
            ))}
          </div>
        )}
      </main>

      <footer className="v-footer">
        <div className="v-wrap"><div className="v-footer-mark" aria-hidden>AZWANN ANIS</div></div>
        <div className="v-wrap v-footer-inner">
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>{name} · {t("px.builtWith")}</span>
          <Link href="/landing" className="v-mono" style={{ color: "var(--v-signal)", textDecoration: "none" }}>{t("px.makeOwn")}</Link>
        </div>
      </footer>

      <ProjectDetailModal
        project={detailProject}
        number={detailProject ? entryNo.get(detailProject.id) : undefined}
        onClose={() => setDetailProject(null)}
        onEdit={() => {}}
        onNotesChange={() => {}}
        readOnly
        isOwner={!!viewerId && viewerId === data.ownerId}
        isAdmin={!!data.viewerIsAdmin}
        showViewers
        onView={onView}
      />
    </Shell>
  );
}
