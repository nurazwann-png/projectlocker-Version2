"use client";

import { useState, useEffect, useMemo } from "react";
import { use } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { Project, ProjectStatus } from "@/types/project";
import type { ProfileData, ProfileLinks } from "@/hooks/useProfile";
import ProjectCard from "@/components/ProjectCard";
import ProjectDetailModal from "@/components/ProjectDetailModal";
import SearchBar, { type SortOption } from "@/components/SearchBar";
import TagCloud from "@/components/TagCloud";
import TimelineView from "@/components/TimelineView";
import StatusBadge from "@/components/StatusBadge";
import Cover from "@/components/Cover";
import ThemePicker from "@/components/ThemePicker";
import ShareDialog from "@/components/ShareDialog";
import { useT } from "@/lib/i18n";
import { formatDate, monogram, pad } from "@/lib/projectMeta";
import { IArrowUpRight, IEye, IGithub, IShare, LockerMark } from "@/components/icons";

const EMPTY_PROFILE: ProfileData & { username?: string | null } = {
  bio: "",
  cover: null,
  coverPosition: { x: 50, y: 50, scale: 1 },
  avatar: null,
  links: {},
  skills: [],
  username: null,
};

type ViewMode = "grid" | "list" | "timeline";

function PageShell({ username, children }: { username: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="vault">
      <div className="v-atmos" />
      <div className="v-noise" />
      <nav className="v-nav">
        <div className="v-wrap v-nav-inner">
          <Link href="/landing" className="v-brand" aria-label="Project Locker">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Project Locker</span>
            <span className="v-brand-path">/ u / {username}</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ThemePicker />
            <Link href="/community" className="v-btn v-btn-sm">{t("nav.community")} <IArrowUpRight /></Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useUser();
  const t = useT();
  const [shareOpen, setShareOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData & { username?: string | null; ownerId?: string; viewerIsAdmin?: boolean }>(EMPTY_PROFILE);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    async function load() {
      try {
        const [pRes, prRes] = await Promise.all([
          fetch(`/api/public/${username}/profile`),
          fetch(`/api/public/${username}/projects`),
        ]);
        if (pRes.status === 404) { setNotFound(true); return; }
        const pData = await pRes.json();
        const prData = await prRes.json();
        setProfile({
          bio: pData.bio ?? "",
          cover: pData.coverUrl ?? null,
          coverPosition: pData.coverPosition ? JSON.parse(pData.coverPosition) : { x: 50, y: 50, scale: 1 },
          avatar: pData.avatarUrl ?? null,
          links: (pData.links as ProfileLinks) ?? {},
          skills: (pData.skills as string[]) ?? [],
          username: pData.username ?? username,
          ownerId: pData.ownerId ?? undefined,
          viewerIsAdmin: pData.viewerIsAdmin ?? false,
        });
        if (pData.preferredView) setViewMode(pData.preferredView as ViewMode);
        const mapped = Array.isArray(prData) ? prData.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: (p.title as string) ?? "",
          description: (p.description as string) ?? "",
          liveUrl: (p.liveUrl as string) ?? "",
          repoUrl: (p.repoUrl as string) ?? "",
          techStack: Array.isArray(p.techStack) ? p.techStack as string[] : [],
          deploymentDate: (p.deploymentDate as string) ?? "",
          status: (p.status as Project["status"]) ?? "Live",
          thumbnail: (p.coverImage as string | null) ?? null,
          notes: (p.notes as string) ?? "",
          notesLocked: Boolean(p.notesLocked),
          features: Array.isArray(p.features) ? p.features as string[] : [],
          pinned: Boolean(p.pinned),
          createdAt: (p.createdAt as string) ?? "",
          updatedAt: (p.updatedAt as string) ?? "",
        })) : [];
        setProjects(mapped);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (tagFilter) list = list.filter((p) => (p.techStack ?? []).includes(tagFilter));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.techStack.some((t) => t.toLowerCase().includes(q)));
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
  const displayName = profile.username ?? username;
  const year = new Date().getFullYear();

  if (loading) return (
    <PageShell username={username}>
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div className="px-spinner" />
          <span className="v-mono" style={{ color: "var(--v-signal)" }}>{t("px.loading")}</span>
        </div>
      </div>
    </PageShell>
  );

  if (notFound) return (
    <PageShell username={username}>
      <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", position: "relative", zIndex: 1, textAlign: "center", padding: 24 }}>
        <div>
          <div className="v-display v-grad-text" style={{ fontSize: "clamp(96px, 20vw, 200px)", lineHeight: 0.9, fontWeight: 700 }}>404</div>
          <h1 className="v-display" style={{ fontSize: 28, marginTop: 18 }}>{t("px.notFound")}</h1>
          <p style={{ color: "var(--v-muted)", marginTop: 10 }}>{t("px.notFoundSub")} <span style={{ fontFamily: "var(--v-mono)", color: "var(--v-signal)" }}>/u/{username}</span>.</p>
          <Link href="/community" className="v-btn" style={{ marginTop: 24 }}>{t("px.browse")} <IArrowUpRight /></Link>
        </div>
      </div>
    </PageShell>
  );

  const links = [
    profile.links.github && { href: profile.links.github, label: "GitHub", icon: <IGithub /> },
    profile.links.linkedin && { href: profile.links.linkedin, label: "LinkedIn", icon: <IArrowUpRight /> },
    profile.links.website && { href: profile.links.website, label: t("pe.website"), icon: <IArrowUpRight /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <PageShell username={username}>
      {/* View-only strip */}
      <div className="v-main" style={{ borderBottom: "1px solid var(--v-line)", background: "rgba(var(--v-c1-rgb),0.05)" }}>
        <div className="v-wrap px-banner">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IEye style={{ width: 13, height: 13, color: "var(--v-signal)" }} /> {t("px.viewing")} <b>@{displayName}</b> · {t("px.readOnly")}</span>
          <span className="hide-sm" style={{ color: "var(--v-faint)" }}>{t("px.public")}</span>
        </div>
      </div>

      {/* ── Profile hero ── */}
      <header className="px-hero v-main">
        {profile.cover ? (
          <div className="px-cover"><img src={profile.cover} alt="" /></div>
        ) : (
          <div className="v-floor" style={{ height: "70%", opacity: 0.4 }} />
        )}
        <div className="v-wrap px-hero-inner">
          <div className="px-avatar v-rise">
            {profile.avatar ? <img src={profile.avatar} alt={`${displayName} avatar`} /> : <div><span className="v-grad-text">{monogram(displayName)}</span></div>}
          </div>
          <div className="v-rise" style={{ animationDelay: "120ms", minWidth: 0 }}>
            <span className="v-eyebrow">{t("px.eyebrow", { year })}</span>
            <h1 className="px-name">@{displayName}</h1>
            {profile.bio && <p className="px-bio">{profile.bio}</p>}
            <div className="px-links">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="v-btn v-btn-sm">{l.icon} {l.label}</a>
              ))}
              <button className="v-btn v-btn-sm" onClick={() => setShareOpen(true)}><IShare /> {t("sh.eyebrow")}</button>
            </div>
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
        {projects.length > 0 && (
          <TagCloud projects={projects} activeTag={tagFilter} onTagClick={(t) => setTagFilter(t === tagFilter ? "" : t)} />
        )}

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
              <div key={project.id} role="listitem" tabIndex={0} className="v-row" style={{ animationDelay: `${Math.min(i, 12) * 35}ms`, gridTemplateColumns: undefined }}
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
                onTagClick={(t) => setTagFilter(t === tagFilter ? "" : t)}
                activeTagFilter={tagFilter}
                readOnly
              />
            ))}
          </div>
        )}
      </main>

      <footer className="v-footer">
        <div className="v-wrap"><div className="v-footer-mark" aria-hidden>AZWANN ANIS</div></div>
        <div className="v-wrap v-footer-inner">
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>@{displayName} · {t("px.builtWith")}</span>
          <Link href="/landing" className="v-mono" style={{ color: "var(--v-signal)", textDecoration: "none" }}>{t("px.makeOwn")}</Link>
        </div>
      </footer>

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} username={profile.username ?? username} onSetUsername={() => {}} />
      <ProjectDetailModal
        project={detailProject}
        number={detailProject ? entryNo.get(detailProject.id) : undefined}
        onClose={() => setDetailProject(null)}
        onEdit={() => {}}
        onNotesChange={() => {}}
        readOnly
        isOwner={!!user && user.id === profile.ownerId}
        isAdmin={!!profile.viewerIsAdmin}
        showViewers
        onView={(projectId) => {
          fetch(`/api/public/projects/${projectId}/view`, { method: "POST", credentials: "include" }).catch(() => {});
        }}
      />
    </PageShell>
  );
}
