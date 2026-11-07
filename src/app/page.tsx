"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type { Project, ProjectFormData, ProjectStatus } from "@/types/project";
import { useProjects } from "@/hooks/useProjects";
import { useProfile } from "@/hooks/useProfile";
import ProjectCard from "@/components/ProjectCard";
import ProjectModal from "@/components/ProjectModal";
import ProjectDetailModal from "@/components/ProjectDetailModal";
import SearchBar, { type SortOption } from "@/components/SearchBar";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import TagCloud from "@/components/TagCloud";
import TimelineView from "@/components/TimelineView";
import StatusBadge from "@/components/StatusBadge";
import Cover from "@/components/Cover";
import ThemePicker from "@/components/ThemePicker";
import { formatDate, pad } from "@/lib/projectMeta";
import {
  IArrowLeft, IArrowUpRight, ICheck, IDownload, IEdit, IGrid, IList, IPin, IPlus,
  ISelect, ITimeline, ITrash, IUpload, IX, LockerMark,
} from "@/components/icons";

type ViewMode = "grid" | "list" | "timeline";

export default function DashboardPage() {
  const { projects, hydrated, addProject, updateProject, updateNotes, updateNotesLock, togglePin, deleteProject, importProjects } = useProjects();
  const { profile, hydrated: profileHydrated, setNotesPin, setPreferredView } = useProfile();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "">("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>("grid");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [undoToast, setUndoToast] = useState<{ project: Project; timeoutId: ReturnType<typeof setTimeout> } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const prevCountRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profileHydrated && profile.preferredView) setViewModeState(profile.preferredView);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileHydrated]);

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    setPreferredView(mode);
  }

  useEffect(() => {
    if (!hydrated) return;
    const prev = prevCountRef.current;
    const curr = projects.length;
    prevCountRef.current = curr;
    if (prev === 0 || curr <= prev) return;
    const MILESTONES: Record<number, string> = {
      1: "First entry locked in.",
      5: "Five projects. You're on a roll.",
      10: "Ten projects. That's a body of work.",
      25: "Twenty-five projects. Legendary.",
      50: "Fifty projects. Absolute legend.",
    };
    if (MILESTONES[curr]) {
      setMilestoneToast(MILESTONES[curr]);
      const t = setTimeout(() => setMilestoneToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [projects.length, hydrated]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable;
      if (e.key === "/" && !inInput) { e.preventDefault(); searchInputRef.current?.focus(); return; }
      if (inInput || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "N") { openAddModal(); return; }
      if (e.key === "g" || e.key === "G") { setViewMode("grid"); return; }
      if (e.key === "l" || e.key === "L") { setViewMode("list"); return; }
      if (e.key === "t" || e.key === "T") { setViewMode("timeline"); return; }
      if (e.key === "?") { setShowShortcuts((v) => !v); return; }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoToast((prev) => { if (prev) clearTimeout(prev.timeoutId); return null; });
  }, []);

  useEffect(() => () => { if (undoToast) clearTimeout(undoToast.timeoutId); }, [undoToast]);

  const displayKey = `${query}|${statusFilter}|${tagFilter}|${sort}|${viewMode}`;

  const displayed = useMemo(() => {
    let list = projects;
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (tagFilter) list = list.filter((p) => p.techStack.includes(tagFilter));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.techStack.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "status") return a.status.localeCompare(b.status);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [projects, query, statusFilter, tagFilter, sort]);

  // Stable entry numbers: order of creation
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

  const uniqueTechCount = useMemo(() => new Set(projects.flatMap((p) => p.techStack)).size, [projects]);
  const liveCount = statusCounts.Live;
  const latest = useMemo(() => [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0], [projects]);
  const year = new Date().getFullYear();

  function toggleSelected(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function bulkDelete() {
    selected.forEach((id) => deleteProject(id));
    setSelected(new Set());
    setBulkMode(false);
  }

  function openAddModal() { setEditingProject(null); setModalOpen(true); }
  function openEditModal(project: Project) { setEditingProject(project); setModalOpen(true); }
  function duplicateProject(project: Project) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _c, name, ...rest } = project;
    addProject({ ...rest, name: `${name} (copy)` });
  }

  function handleSave(data: ProjectFormData) {
    if (editingProject) updateProject(editingProject.id, data);
    else addProject(data);
    setModalOpen(false);
    setEditingProject(null);
  }

  function confirmDelete() {
    if (!deleteConfirmId) return;
    const project = projects.find((p) => p.id === deleteConfirmId);
    if (!project) { setDeleteConfirmId(null); return; }
    deleteProject(deleteConfirmId);
    setDeleteConfirmId(null);
    if (undoToast) clearTimeout(undoToast.timeoutId);
    const timeoutId = setTimeout(() => setUndoToast(null), 5000);
    setUndoToast({ project, timeoutId });
  }

  const projectToDelete = projects.find((p) => p.id === deleteConfirmId);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!Array.isArray(data)) { alert("Invalid file: expected a JSON array."); return; }
        importProjects(data as Project[]);
      } catch { alert("Failed to parse JSON file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function clearFilters() { setQuery(""); setStatusFilter(""); setTagFilter(""); }

  const hasProjects = hydrated && projects.length > 0;

  return (
    <div className="vault">
      <div className="v-atmos" />
      <div className="v-noise" />

      {/* ── Nav ── */}
      <nav className="v-nav">
        <div className="v-wrap v-nav-inner">
          <Link href="/" className="v-brand" aria-label="Locker home">
            <LockerMark className="v-brand-mark" />
            <span className="v-brand-name">Locker</span>
            <span className="v-brand-path">/ nurazwann</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="v-nav-hints">
              <kbd className="v-kbd">/</kbd> search <span style={{ opacity: 0.4 }}>·</span>
              <kbd className="v-kbd">N</kbd> new <span style={{ opacity: 0.4 }}>·</span>
              <button onClick={() => setShowShortcuts(true)} className="v-kbd" style={{ cursor: "pointer" }} aria-label="Keyboard shortcuts">?</button>
            </span>
            <ThemePicker />
            <Link href="/landing" className="v-btn v-btn-sm v-btn-quiet"><IArrowLeft /> <span className="v-hide-xs">Home</span></Link>
            <button onClick={openAddModal} className="v-btn v-btn-sm v-btn-primary"><IPlus /> New project</button>
          </div>
        </div>
      </nav>

      <main className="v-main v-wrap">
        {/* ── Hero ── */}
        <header className="v-hero">
          <div className="v-hero-top v-rise">
            <span className="v-eyebrow">Project Locker · Vol. {year}</span>
            <span className="v-mono v-hero-status">
              <span className={`v-led ${liveCount > 0 ? "is-live" : ""}`} style={liveCount > 0 ? undefined : { background: "var(--v-faint)" }} />
              {hydrated ? `${liveCount} live · ${projects.length} in locker` : "Opening locker…"}
            </span>
          </div>

          <div>
            <h1 className="v-hero-title">
              <span className="v-line" style={{ animationDelay: "80ms" }}>Shipped work,</span>
              <span className="v-line" style={{ animationDelay: "200ms" }}><em>kept</em> under lock.</span>
            </h1>
            <p className="v-hero-sub v-rise" style={{ animationDelay: "320ms" }}>
              The working index of <b>Nurazwann bin Ismail</b> — every app designed, built and deployed,
              with the stack, the story and the live link one click away.
            </p>
          </div>

          <aside className="v-rise" style={{ animationDelay: "420ms" }}>
            <div className="v-stats v-hud">
              {([[projects.length, "Projects"], [uniqueTechCount, "Technologies"], [liveCount, "Live now"]] as const).map(([n, label]) => (
                <div key={label} className="v-stat">
                  <div className="v-stat-num">{hydrated ? pad(n) : "––"}</div>
                  <div className="v-mono v-stat-label">{label}</div>
                </div>
              ))}
            </div>
            {latest && (
              <button className="v-latest" onClick={() => setDetailProject(latest)}>
                <span className="v-mono" style={{ fontSize: 10 }}>Latest</span>
                <span className="v-latest-name">{latest.name}</span>
                <IArrowUpRight />
              </button>
            )}
          </aside>
        </header>

        {hasProjects && <ActivityHeatmap projects={projects} />}

        {/* ── Index ── */}
        <div className="v-section-head">
          <div>
            <span className="v-eyebrow">The index</span>
            <h2 className="v-section-title">
              All projects
              {hasProjects && <sup>{pad(displayed.length)}/{pad(projects.length)}</sup>}
            </h2>
          </div>
          <div className="v-actions">
            {hasProjects && (
              <button onClick={() => { setBulkMode((v) => !v); setSelected(new Set()); }} className="v-btn v-btn-sm" aria-pressed={bulkMode}>
                <ISelect /> {bulkMode ? "Done" : "Select"}
              </button>
            )}
            {hasProjects && <button onClick={exportJSON} className="v-btn v-btn-sm" title="Export JSON backup"><IDownload /> Export</button>}
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button onClick={() => importInputRef.current?.click()} className="v-btn v-btn-sm" title="Import JSON"><IUpload /> Import</button>
            <div className="v-seg" role="group" aria-label="View mode">
              {([["grid", IGrid, "Grid"], ["list", IList, "List"], ["timeline", ITimeline, "Timeline"]] as const).map(([mode, Icon, label]) => (
                <button key={mode} onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode} title={`${label} view`} aria-label={`${label} view`}>
                  <Icon />
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasProjects && (
          <SearchBar
            query={query} onQueryChange={setQuery}
            statusFilter={statusFilter} onStatusChange={setStatusFilter}
            sort={sort} onSortChange={setSort}
            inputRef={searchInputRef} counts={statusCounts}
          />
        )}

        {hasProjects && <TagCloud projects={projects} activeTag={tagFilter} onTagClick={setTagFilter} />}

        {(tagFilter || statusFilter || query) && (
          <div className="v-filters">
            <span className="v-mono" style={{ color: "var(--v-faint)" }}>Filtered by</span>
            {tagFilter && <span className="v-chip">#{tagFilter}<button onClick={() => setTagFilter("")} aria-label="Remove tag filter"><IX /></button></span>}
            {statusFilter && <span className="v-chip">{statusFilter}<button onClick={() => setStatusFilter("")} aria-label="Remove status filter"><IX /></button></span>}
            {query && <span className="v-chip">&ldquo;{query}&rdquo;<button onClick={() => setQuery("")} aria-label="Clear search"><IX /></button></span>}
            <button onClick={clearFilters} className="v-btn v-btn-sm v-btn-quiet">Clear all</button>
          </div>
        )}

        {/* ── Content ── */}
        {!hydrated ? (
          <div className="v-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="v-card" style={{ cursor: "default", animationDelay: `${i * 80}ms` }}>
                <div className="v-card-media v-skel" />
                <div className="v-card-body" style={{ gap: 10 }}>
                  <div className="v-skel" style={{ height: 12, width: "30%" }} />
                  <div className="v-skel" style={{ height: 26, width: "70%" }} />
                  <div className="v-skel" style={{ height: 12, width: "90%" }} />
                  <div className="v-skel" style={{ height: 12, width: "55%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyLocker onAdd={openAddModal} />
        ) : displayed.length === 0 ? (
          <div style={{ padding: "72px 0", textAlign: "center" }}>
            <p className="v-display" style={{ fontSize: 32, lineHeight: 1.05 }}>Nothing matches <em className="v-grad-text" style={{ fontStyle: "normal" }}>that</em>.</p>
            <p style={{ color: "var(--v-muted)", marginTop: 12 }}>Try a different word, tag or status.</p>
            <button onClick={clearFilters} className="v-btn" style={{ marginTop: 22 }}>Clear filters</button>
          </div>
        ) : viewMode === "timeline" ? (
          <TimelineView key={displayKey} projects={displayed} onCardClick={setDetailProject} onEdit={openEditModal} />
        ) : viewMode === "grid" ? (
          <div key={displayKey} className="v-grid">
            {displayed.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                number={entryNo.get(project.id)}
                index={i}
                onEdit={openEditModal}
                onDelete={(id) => setDeleteConfirmId(id)}
                onTagClick={setTagFilter}
                activeTagFilter={tagFilter}
                onDuplicate={duplicateProject}
                onCardClick={bulkMode ? (p) => toggleSelected(p.id) : setDetailProject}
                onPin={togglePin}
                selectMode={bulkMode}
                selected={selected.has(project.id)}
                onThumbnailChange={(id, url) => { const p = projects.find((x) => x.id === id); if (p) updateProject(id, { ...p, thumbnail: url }); }}
              />
            ))}
          </div>
        ) : (
          <div key={displayKey} className="v-list" role="list">
            {displayed.map((project, i) => (
              <div
                key={project.id}
                role="listitem"
                tabIndex={0}
                className={`v-row${bulkMode && selected.has(project.id) ? " is-selected" : ""}`}
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                onClick={() => (bulkMode ? toggleSelected(project.id) : setDetailProject(project))}
                onKeyDown={(e) => { if (e.key === "Enter") (bulkMode ? toggleSelected(project.id) : setDetailProject(project)); }}
              >
                <span className="v-card-no hide-sm">
                  {bulkMode ? (
                    <span className={`v-check${selected.has(project.id) ? " is-on" : ""}`}>{selected.has(project.id) && <ICheck />}</span>
                  ) : `№${pad(entryNo.get(project.id) ?? i + 1, 3)}`}
                </span>
                <div className="v-row-thumb"><Cover name={project.name} src={project.thumbnail} showCode={false} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="v-row-name">{project.pinned && <IPin style={{ display: "inline-block", width: 14, height: 14, color: "var(--v-signal)", marginRight: 8, verticalAlign: "middle" }} />}{project.name}</div>
                </div>
                <div className="v-row-stack hide-sm">{project.techStack.join("  /  ") || "—"}</div>
                <div><StatusBadge status={project.status} /></div>
                <div className="v-row-date hide-sm">{formatDate(project.deploymentDate)}</div>
                <div className="v-row-actions hide-sm">
                  <button className={`v-icon-btn${project.pinned ? " is-on" : ""}`} onClick={(e) => { e.stopPropagation(); togglePin(project.id); }} aria-label={project.pinned ? "Unpin" : "Pin"} title={project.pinned ? "Unpin" : "Pin"}><IPin /></button>
                  <button className="v-icon-btn" onClick={(e) => { e.stopPropagation(); openEditModal(project); }} aria-label="Edit" title="Edit"><IEdit /></button>
                  <button className="v-icon-btn is-danger" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(project.id); }} aria-label="Delete" title="Delete"><ITrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="v-footer">
        <div className="v-wrap">
          <div className="v-footer-mark" aria-hidden>LOCKER</div>
        </div>
        <div className="v-wrap v-footer-inner">
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>© {year} Nurazwann bin Ismail · Pejabat Pendidikan Daerah Dalat</span>
          <span className="v-mono" style={{ color: "var(--v-faint)" }}>All rights reserved</span>
        </div>
      </footer>

      {/* ── Detail & form drawers ── */}
      <ProjectDetailModal
        project={detailProject}
        number={detailProject ? entryNo.get(detailProject.id) : undefined}
        onClose={() => setDetailProject(null)}
        onEdit={(p) => { setDetailProject(null); openEditModal(p); }}
        onNotesChange={updateNotes}
        onNotesLockChange={updateNotesLock}
        onNotesPinChange={setNotesPin}
        notesPin={profile.notesPin}
        isOwner={true}
      />
      <ProjectModal isOpen={modalOpen} project={editingProject} onClose={() => { setModalOpen(false); setEditingProject(null); }} onSave={handleSave} />

      {/* ── Delete confirm ── */}
      {deleteConfirmId && (
        <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="v-backdrop" onClick={() => setDeleteConfirmId(null)} />
          <div className="v-dialog v-hud">
            <span className="v-eyebrow" style={{ color: "var(--v-coral)" }}>Irreversible</span>
            <h3 id="delete-title" className="v-dialog-title" style={{ marginTop: 14 }}>Remove from the locker?</h3>
            <p style={{ color: "var(--v-muted)", lineHeight: 1.6, margin: "12px 0 24px" }}>
              <span style={{ color: "var(--v-text)" }}>&ldquo;{projectToDelete?.name}&rdquo;</span> will be deleted. You&apos;ll have five seconds to undo.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setDeleteConfirmId(null)} className="v-btn">Keep it</button>
              <button onClick={confirmDelete} className="v-btn v-btn-danger" autoFocus><ITrash /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shortcuts ── */}
      {showShortcuts && (
        <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
          <div className="v-backdrop" onClick={() => setShowShortcuts(false)} />
          <div className="v-dialog v-hud" style={{ width: "min(380px, calc(100% - 32px))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 id="shortcuts-title" className="v-dialog-title">Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="v-icon-btn" aria-label="Close"><IX /></button>
            </div>
            <div style={{ marginTop: 18, borderTop: "1px solid var(--v-line)" }}>
              {[["N", "New project"], ["/", "Search"], ["G", "Grid view"], ["L", "List view"], ["T", "Timeline view"], ["?", "Toggle this panel"], ["Esc", "Close drawer"]].map(([key, label]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--v-line)" }}>
                  <span style={{ color: "var(--v-muted)" }}>{label}</span>
                  <kbd className="v-kbd">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      {bulkMode && selected.size > 0 && (
        <div className="v-toast is-bottom">
          <span><b style={{ fontWeight: 600 }}>{selected.size}</b> selected</span>
          <button onClick={() => setSelected(new Set(displayed.map((p) => p.id)))} className="v-btn v-btn-sm v-btn-quiet">Select all</button>
          <button onClick={bulkDelete} className="v-btn v-btn-sm v-btn-danger"><ITrash /> Delete {selected.size}</button>
        </div>
      )}
      {milestoneToast && (
        <div className="v-toast is-top">
          <span className="v-led is-live" />
          <span>{milestoneToast}</span>
          <button onClick={() => setMilestoneToast(null)} className="v-icon-btn" aria-label="Dismiss"><IX /></button>
        </div>
      )}
      {undoToast && (
        <div className="v-toast is-bottom">
          <span><span style={{ color: "var(--v-muted)" }}>Deleted</span> &ldquo;{undoToast.project.name}&rdquo;</span>
          <button onClick={() => { importProjects([undoToast.project]); dismissUndo(); }} className="v-btn v-btn-sm" style={{ borderColor: "rgba(var(--v-c1-rgb),0.45)", color: "var(--v-signal)" }}>Undo</button>
          <button onClick={dismissUndo} className="v-icon-btn" aria-label="Dismiss"><IX /></button>
        </div>
      )}
    </div>
  );
}

function EmptyLocker({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="v-empty">
      <div className="v-rise">
        <h3 className="v-empty-title">Nothing in here <em>yet.</em></h3>
        <p style={{ color: "var(--v-muted)", fontSize: 15.5, lineHeight: 1.65, marginTop: 18, maxWidth: 460 }}>
          Every locker starts empty. Add the first app you&apos;ve shipped and it gets a number, a cover and a permanent place in the index.
        </p>
        <ol className="v-steps">
          <li><span>01</span><span><b>Name it</b> — and say what it does in a sentence.</span></li>
          <li><span>02</span><span><b>Tag the stack</b> — Next.js, Laravel, whatever it runs on.</span></li>
          <li><span>03</span><span><b>Link it live</b> — so anyone can open it in one click.</span></li>
        </ol>
        <button onClick={onAdd} className="v-btn v-btn-lg v-btn-primary"><IPlus /> Add your first project</button>
      </div>
      <LockerArt />
    </section>
  );
}

function LockerArt() {
  const doors = Array.from({ length: 12 }, (_, i) => i);
  return (
    <svg className="v-locker-art v-rise" style={{ animationDelay: "150ms" }} viewBox="0 0 400 480" fill="none" aria-hidden>
      <defs>
        <radialGradient id="lk-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "var(--v-c2)", stopOpacity: 0.6 }} />
          <stop offset="60%" style={{ stopColor: "var(--v-c1)", stopOpacity: 0.18 }} />
          <stop offset="100%" style={{ stopColor: "var(--v-c1)", stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id="lk-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" style={{ stopColor: "var(--v-c1)" }} />
          <stop offset="50%" style={{ stopColor: "var(--v-c2)" }} />
          <stop offset="100%" style={{ stopColor: "var(--v-c3)" }} />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="360" height="440" rx="18" style={{ stroke: "rgba(var(--v-ink-rgb),0.25)" }} />
      {doors.map((i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 40 + col * 110, y = 40 + row * 104;
        const open = i === 4;
        return (
          <g key={i}>
            {open ? (
              <>
                <rect x={x} y={y} width="100" height="94" rx="8" style={{ fill: "var(--v-bg-2)" }} stroke="url(#lk-grad)" strokeWidth="1.5" />
                <ellipse cx={x + 50} cy={y + 47} rx="74" ry="64" fill="url(#lk-glow)" />
                <path d={`M${x} ${y} L${x - 14} ${y + 8} L${x - 14} ${y + 86} L${x} ${y + 94} Z`} style={{ fill: "var(--v-panel-2)", stroke: "rgba(var(--v-ink-rgb),0.3)" }} />
                <text x={x + 50} y={y + 58} textAnchor="middle" fontFamily="Unbounded, sans-serif" fontWeight="700" fontSize="30" letterSpacing="-2" fill="url(#lk-grad)">01</text>
              </>
            ) : (
              <>
                <rect x={x} y={y} width="100" height="94" rx="8" style={{ fill: "var(--v-panel)", stroke: "rgba(var(--v-ink-rgb),0.16)" }} />
                {[0, 1, 2].map((v) => <rect key={v} x={x + 18} y={y + 14 + v * 7} width="40" height="2.5" rx="1.25" style={{ fill: "rgba(var(--v-ink-rgb),0.14)" }} />)}
                <rect x={x + 82} y={y + 40} width="4" height="16" rx="2" style={{ fill: "rgba(var(--v-ink-rgb),0.22)" }} />
                <text x={x + 14} y={y + 84} fontFamily="Geist Mono, monospace" fontSize="9" letterSpacing="1.5" style={{ fill: "rgba(var(--v-ink-rgb),0.35)" }}>{String(i + 1).padStart(2, "0")}</text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
