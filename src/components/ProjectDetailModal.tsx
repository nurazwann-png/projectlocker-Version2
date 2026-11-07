"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project } from "@/types/project";
import StatusBadge from "./StatusBadge";
import CommentSection from "./CommentSection";
import Cover from "./Cover";
import { formatDate, healthColor, healthScore, pad } from "@/lib/projectMeta";
import { IArrowUpRight, IEdit, IEye, IGithub, ILock, IUnlock, IX } from "./icons";

interface Viewer {
  viewerName: string;
  viewerId: string | null;
  count: number;
  lastSeen: string;
}

interface ProjectDetailModalProps {
  project: Project | null;
  number?: number;
  onClose: () => void;
  onEdit: (project: Project) => void;
  onNotesChange: (id: string, notes: string) => void;
  onNotesLockChange?: (id: string, locked: boolean) => void;
  onNotesPinChange?: (pin: string) => void;
  notesPin?: string | null;
  readOnly?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  showViewers?: boolean;
  onView?: (projectId: string) => void;
  onOpen?: (projectId: string) => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotesContent({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "var(--v-signal)", textDecoration: "underline", wordBreak: "break-all" }}>{part}</a>
        ) : <span key={i}>{part}</span>
      )}
    </>
  );
}

export default function ProjectDetailModal({
  project, number, onClose, onEdit, onNotesChange,
  onNotesLockChange, onNotesPinChange,
  notesPin, readOnly = false, isOwner = false, showViewers = false, onView, onOpen,
}: ProjectDetailModalProps) {
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notesUnlocked, setNotesUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [settingPin, setSettingPin] = useState(false);
  const [lockAfterPin, setLockAfterPin] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinConfirmError, setPinConfirmError] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);

  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [viewersExpanded, setViewersExpanded] = useState(false);

  useEffect(() => {
    if (!project) return;
    setNotes(project.notes ?? "");
    setNotesUnlocked(false);
    setPinInput(""); setPinError(false);
    setSettingPin(false); setLockAfterPin(false);
    setPinDraft(""); setPinConfirm(""); setPinConfirmError(false);
    setViewers([]); setTotalViews(0); setViewersExpanded(false);
    onOpen?.(project.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  useEffect(() => {
    if (!project || (!isOwner && !showViewers)) return;
    const url = isOwner ? `/api/projects/${project.id}/views` : `/api/public/projects/${project.id}/views`;
    fetch(url, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) { setViewers(data.viewers); setTotalViews(data.totalViews); } })
      .catch(() => {});
  }, [project?.id, isOwner, showViewers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    setNotesSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!project) return;
    saveTimer.current = setTimeout(() => {
      onNotesChange(project.id, val);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }, 800);
  }, [project, onNotesChange]);

  useEffect(() => {
    if (!project) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = prevOverflow; };
  }, [project, onClose]);

  if (!project) return null;

  const liveUrl = project.liveUrl?.startsWith("http") ? project.liveUrl : project.liveUrl ? `https://${project.liveUrl}` : null;
  const repoUrl = project.repoUrl?.startsWith("http") ? project.repoUrl : project.repoUrl ? `https://${project.repoUrl}` : null;
  const isLocked = project.notesLocked ?? false;
  const score = healthScore(project);
  const features = (project.features ?? []).filter(Boolean);

  function tryUnlock() {
    if (!notesPin) { setNotesUnlocked(true); return; }
    if (pinInput === notesPin) { setNotesUnlocked(true); setPinError(false); setPinInput(""); }
    else { setPinError(true); setPinInput(""); }
  }

  function handleLockClick() {
    if (!notesPin) { setLockAfterPin(true); setSettingPin(true); }
    else { onNotesLockChange?.(project!.id, true); setNotesUnlocked(false); }
  }

  async function handleSavePin() {
    if (pinDraft.length !== 4) return;
    if (pinDraft !== pinConfirm) { setPinConfirmError(true); return; }
    setPinSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notesPin: pinDraft }),
      });
      if (!res.ok) return;
      onNotesPinChange?.(pinDraft);
      if (lockAfterPin) { onNotesLockChange?.(project!.id, true); setNotesUnlocked(false); }
    } catch {
      // network failure — keep dialog state reset below
    } finally {
      setPinSaving(false);
      setSettingPin(false);
      setLockAfterPin(false);
      setPinDraft(""); setPinConfirm(""); setPinConfirmError(false);
    }
  }

  return (
    <div className="v-overlay" role="dialog" aria-modal="true" aria-labelledby="pd-title">
      <div className="v-backdrop" onClick={onClose} />
      <div className="v-drawer" style={{ width: "min(780px, 100%)" }}>
        <div className="v-drawer-head">
          <span className="v-eyebrow">Entry №{pad(number ?? 0, 3)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!readOnly && (
              <button onClick={() => { onClose(); onEdit(project); }} className="v-btn v-btn-sm"><IEdit /> Edit</button>
            )}
            <button onClick={onClose} className="v-icon-btn" aria-label="Close"><IX /></button>
          </div>
        </div>

        <div className="v-drawer-body">
          <div className="v-dossier-media">
            <Cover name={project.name} src={project.thumbnail} />
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <h2 id="pd-title" className="v-dossier-title">{project.name}</h2>
          </div>
          <p className="v-dossier-desc">{project.description}</p>

          {(liveUrl || (!readOnly && repoUrl)) && (
            <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
              {liveUrl && (
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => onView?.(project.id)} className="v-btn v-btn-primary">
                  Open live site <IArrowUpRight />
                </a>
              )}
              {!readOnly && repoUrl && (
                <a href={repoUrl} target="_blank" rel="noopener noreferrer" onClick={() => onView?.(project.id)} className="v-btn">
                  <IGithub /> Repository
                </a>
              )}
            </div>
          )}

          <div className="v-meta">
            <div><div className="v-mono" style={{ fontSize: 10, color: "var(--v-faint)" }}>Status</div><div className="v-meta-val"><StatusBadge status={project.status} /></div></div>
            <div><div className="v-mono" style={{ fontSize: 10, color: "var(--v-faint)" }}>Shipped</div><div className="v-meta-val">{formatDate(project.deploymentDate)}</div></div>
            <div>
              <div className="v-mono" style={{ fontSize: 10, color: "var(--v-faint)" }}>Health</div>
              <div className="v-meta-val">
                <span className="v-health-bar" style={{ width: 56 }}><i style={{ width: `${score}%`, background: healthColor(score) }} /></span>
                <span style={{ fontFamily: "var(--v-mono)", fontSize: 13 }}>{score}</span>
              </div>
            </div>
            <div><div className="v-mono" style={{ fontSize: 10, color: "var(--v-faint)" }}>Added</div><div className="v-meta-val">{formatDate(project.createdAt)}</div></div>
          </div>

          {project.techStack.length > 0 && (
            <div className="v-block">
              <div className="v-block-head"><span className="v-eyebrow">Stack</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {project.techStack.map((tag) => <span key={tag} className="v-chip" style={{ paddingRight: 10 }}>{tag}</span>)}
              </div>
            </div>
          )}

          {features.length > 0 && (
            <div className="v-block">
              <div className="v-block-head"><span className="v-eyebrow">Highlights</span></div>
              <ol className="v-features">{features.map((f, i) => <li key={i}>{f}</li>)}</ol>
            </div>
          )}

          {/* Notes */}
          {readOnly ? (
            isLocked ? (
              <div className="v-block">
                <div className="v-lockbox"><ILock style={{ width: 20, height: 20, color: "var(--v-faint)" }} /><span style={{ color: "var(--v-muted)" }}>Notes are private.</span></div>
              </div>
            ) : project.notes ? (
              <div className="v-block">
                <div className="v-block-head"><span className="v-eyebrow">Notes</span></div>
                <div className="v-notes-box"><NotesContent text={project.notes} /></div>
              </div>
            ) : null
          ) : (
            <div className="v-block">
              <div className="v-block-head">
                <span className="v-eyebrow">Private notes</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {notesSaved && !isLocked && <span className="v-mono" style={{ color: "var(--v-signal)", marginRight: 6 }}>Saved</span>}
                  {(!isLocked || notesUnlocked) && (
                    <button onClick={() => { setSettingPin((v) => !v); setLockAfterPin(false); }} className="v-btn v-btn-sm v-btn-quiet">
                      {notesPin ? "Change PIN" : "Set PIN"}
                    </button>
                  )}
                  {!isLocked ? (
                    <button onClick={handleLockClick} className="v-btn v-btn-sm v-btn-quiet" title="Lock this note"><ILock /> Lock</button>
                  ) : notesUnlocked ? (
                    <button onClick={() => { onNotesLockChange?.(project.id, false); setNotesUnlocked(false); }} className="v-btn v-btn-sm v-btn-quiet" style={{ color: "var(--v-signal)" }} title="Remove lock">
                      <IUnlock /> Remove lock
                    </button>
                  ) : null}
                </div>
              </div>

              {settingPin && (
                <div className="v-subpanel" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--v-text)", marginBottom: 12 }}>{notesPin ? "Change your 4-digit PIN" : "Set a 4-digit PIN to lock notes"}</div>
                  <div className="v-field-row">
                    <input type="password" inputMode="numeric" maxLength={4} value={pinDraft}
                      onChange={(e) => { setPinDraft(e.target.value.replace(/\D/g, "")); setPinConfirmError(false); }}
                      placeholder="New PIN" className="v-input" />
                    <input type="password" inputMode="numeric" maxLength={4} value={pinConfirm}
                      onChange={(e) => { setPinConfirm(e.target.value.replace(/\D/g, "")); setPinConfirmError(false); }}
                      placeholder="Confirm PIN" className={`v-input${pinConfirmError ? " is-error" : ""}`} />
                  </div>
                  {pinConfirmError && <div className="v-error" style={{ marginTop: 8 }}>PINs don&apos;t match.</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={handleSavePin} disabled={pinSaving || pinDraft.length !== 4} className="v-btn v-btn-sm v-btn-primary">
                      {pinSaving ? "Saving…" : lockAfterPin ? "Save PIN & lock" : "Save PIN"}
                    </button>
                    <button onClick={() => { setSettingPin(false); setLockAfterPin(false); setPinDraft(""); setPinConfirm(""); setPinConfirmError(false); }} className="v-btn v-btn-sm v-btn-quiet">Cancel</button>
                  </div>
                </div>
              )}

              {isLocked && !notesUnlocked ? (
                <div className="v-lockbox">
                  <ILock style={{ width: 22, height: 22, color: "var(--v-muted)" }} />
                  <span style={{ color: "var(--v-muted)", fontSize: 14 }}>Enter your PIN to read these notes</span>
                  <input type="password" inputMode="numeric" maxLength={4} value={pinInput}
                    onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
                    placeholder="····" className={`v-input v-pin-input${pinError ? " is-error" : ""}`} autoFocus />
                  {pinError && <span className="v-error">Incorrect PIN.</span>}
                  <button onClick={tryUnlock} className="v-btn v-btn-sm">Unlock</button>
                </div>
              ) : (
                <>
                  <textarea value={notes} onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Key learnings, known issues, what you'd do differently…" rows={5} className="v-input" />
                  <div className="v-hint" style={{ marginTop: 8 }}>Autosaves as you type</div>
                </>
              )}
            </div>
          )}

          {(isOwner || showViewers) && (
            <div className="v-block">
              <button onClick={() => setViewersExpanded((v) => !v)} className="v-btn v-btn-sm v-btn-quiet" style={{ paddingLeft: 0 }}>
                <IEye /> {totalViews} view{totalViews !== 1 ? "s" : ""} · {viewers.length} unique {viewersExpanded ? "▴" : "▾"}
              </button>
              {viewersExpanded && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--v-line)" }}>
                  {viewers.length === 0 ? (
                    <p className="v-hint" style={{ padding: "12px 0" }}>No views yet.</p>
                  ) : viewers.map((v, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--v-line)" }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--v-panel-3)", fontFamily: "var(--v-display)", fontSize: 16 }}>{v.viewerName.charAt(0).toUpperCase()}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13 }}>{v.viewerId ? `@${v.viewerName}` : v.viewerName}</span>
                        <span className="v-hint">Last seen {relativeTime(v.lastSeen)}</span>
                      </span>
                      <span className="v-mono" style={{ color: "var(--v-signal)" }}>{v.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="v-comments">
            <CommentSection projectId={project.id} isOwner={isOwner} onCommentPosted={() => onView?.(project.id)} />
          </div>
        </div>
      </div>
    </div>
  );
}
