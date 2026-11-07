"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Comment {
  id: string;
  parentId: string | null;
  authorId?: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  replies?: Comment[];
}

interface CommentSectionProps {
  projectId: string;
  isOwner?: boolean;
  onCommentPosted?: () => void;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AVATAR_COLORS = ["#3a3f2a","#4a3a24","#26394a","#4a2e2a","#352e4a","#24443a","#3d3a33","#2f3640"];
function avatarColor(name: string): string {
  return AVATAR_COLORS[hashStr(name) % AVATAR_COLORS.length];
}

function buildTree(flat: Omit<Comment, "replies">[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
  for (const c of flat) map.set(c.id, { ...c, replies: [] });
  for (const c of flat) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(map.get(c.id)!);
    } else if (!c.parentId) {
      roots.push(map.get(c.id)!);
    }
  }
  return roots;
}

/* ── inline comment/reply form ── */
interface CommentFormProps {
  projectId: string;
  parentId?: string;
  onPosted: (comment: Comment) => void;
  onCancel: () => void;
  placeholder?: string;
}

function CommentForm({ projectId, parentId, onPosted, onCancel, placeholder = "Write a comment…" }: CommentFormProps) {
  const { user, isLoaded } = useUser();
  const clerkName = user ? (user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "") : null;
  const [guestName, setGuestName] = useState(() => {
    try { return localStorage.getItem("comment-name") ?? ""; } catch { return ""; }
  });
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const authorName = clerkName ?? guestName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorName.trim() || !body.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      if (!clerkName) { try { localStorage.setItem("comment-name", authorName.trim()); } catch {} }
      const res = await fetch(`/api/public/comments/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: authorName.trim(), body: body.trim(), parentId: parentId ?? null }),
      });
      if (!res.ok) { setError("Failed to post. Try again."); return; }
      const comment: Comment = await res.json();
      onPosted(comment);
      setBody("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {isLoaded && clerkName ? (
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)" }}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="h-5 w-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: avatarColor(clerkName) }}>
              {clerkName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs font-semibold truncate" style={{ color: "var(--v-text)" }}>{clerkName}</span>
          <span className="text-[10px] ml-auto" style={{ color: "var(--v-faint)" }}>signed in</span>
        </div>
      ) : (
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          required
          className="w-full rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--v-text)" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,255,63,0.55)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        required
        rows={2}
        className="w-full resize-none rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--v-text)", lineHeight: 1.6 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,255,63,0.55)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        autoFocus
      />
      {error && <p className="text-[10px]" style={{ color: "var(--v-coral)" }}>{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color: "var(--v-faint)" }}>{body.length}/500</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="text-xs transition-colors" style={{ color: "var(--v-faint)" }}>Cancel</button>
          <button
            type="submit"
            disabled={submitting || !authorName.trim() || !body.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
            style={{ background: "rgba(212,255,63,0.12)", color: "var(--v-signal)", border: "1px solid rgba(255,255,255,0.12)", opacity: (submitting || !authorName.trim() || !body.trim()) ? 0.5 : 1 }}
          >
            {submitting ? "Posting…" : parentId ? "Reply" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── single comment row ── */
interface CommentRowProps {
  comment: Comment;
  projectId: string;
  onReplyPosted: (reply: Comment, parentId: string) => void;
  onAcknowledge: (commentId: string) => void;
  onDelete: (commentId: string, parentId: string | null) => void;
  onEdit: (commentId: string, newBody: string) => void;
  isOwner?: boolean;
  isReply?: boolean;
}

function CommentRow({ comment, projectId, onReplyPosted, onAcknowledge, onDelete, onEdit, isOwner = false, isReply = false, currentUserId }: CommentRowProps & { currentUserId?: string | null }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [acking, setAcking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const replies = comment.replies ?? [];

  const isAuthor = !!currentUserId && currentUserId === comment.authorId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isOwner;

  async function handleAcknowledge() {
    setAcking(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}/acknowledge`, { method: "PATCH", credentials: "include" });
      if (res.ok) onAcknowledge(comment.id);
    } finally {
      setAcking(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) onDelete(comment.id, comment.parentId);
    } finally {
      setDeleting(false);
    }
  }

  async function handleEditSave() {
    if (!editBody.trim() || editBody.trim() === comment.body) { setEditMode(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (res.ok) {
        onEdit(comment.id, editBody.trim());
        setEditMode(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-start">
        <div
          className="flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white"
          style={{ background: avatarColor(comment.authorName), width: isReply ? 22 : 26, height: isReply ? 22 : 26, fontSize: isReply ? 9 : 10 }}
        >
          {comment.authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xs font-semibold" style={{ color: "var(--v-text)", fontSize: isReply ? 11 : 12 }}>{comment.authorName}</span>
            <span style={{ color: "var(--v-faint)", fontSize: 10 }}>{relativeTime(comment.createdAt)}</span>
            {comment.acknowledged && (
              <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                ✓ Noted
              </span>
            )}
          </div>

          {editMode ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={500}
                rows={2}
                autoFocus
                className="w-full resize-none rounded-lg px-3 py-1.5 text-xs outline-none"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--v-text)", lineHeight: 1.6 }}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditSave}
                  disabled={saving || !editBody.trim()}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all"
                  style={{ background: "rgba(212,255,63,0.12)", color: "var(--v-signal)", border: "1px solid rgba(255,255,255,0.12)", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => { setEditMode(false); setEditBody(comment.body); }} className="text-[11px]" style={{ color: "var(--v-faint)" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="leading-relaxed mt-0.5 break-words" style={{ color: "var(--v-muted)", fontSize: isReply ? 11 : 12 }}>{comment.body}</p>
          )}

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {!isReply && !editMode && (
              <button
                onClick={() => setShowReplyForm((v) => !v)}
                className="text-[11px] font-medium transition-colors"
                style={{ color: showReplyForm ? "var(--v-signal)" : "var(--v-faint)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-signal)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = showReplyForm ? "var(--v-signal)" : "var(--v-faint)"; }}
              >
                {showReplyForm ? "Cancel" : "↩ Reply"}
              </button>
            )}
            {/* Acknowledge — owner on other people's top-level comments */}
            {isOwner && !isReply && !editMode && comment.authorId !== currentUserId && (
              <button
                onClick={handleAcknowledge}
                disabled={acking}
                className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 transition-all"
                style={{
                  background: comment.acknowledged ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.05)",
                  color: comment.acknowledged ? "#10b981" : "var(--v-faint)",
                  border: `1px solid ${comment.acknowledged ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.12)"}`,
                  opacity: acking ? 0.6 : 1,
                }}
                title={comment.acknowledged ? "Mark as unacknowledged" : "Mark as noted / taken into consideration"}
              >
                {comment.acknowledged ? "✓ Noted" : "Mark as noted"}
              </button>
            )}
            {/* Edit — author only */}
            {canEdit && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-[11px] transition-colors"
                style={{ color: "var(--v-faint)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-signal)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-faint)"; }}
                title="Edit comment"
              >
                Edit
              </button>
            )}
            {/* Delete — author or project owner */}
            {canDelete && !editMode && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[11px] transition-colors"
                style={{ color: "var(--v-faint)", opacity: deleting ? 0.5 : 1 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-coral)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-faint)"; }}
                title="Delete comment"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplyForm && (
        <div className="ml-8 mt-2">
          <CommentForm
            projectId={projectId}
            parentId={comment.id}
            placeholder={`Replying to ${comment.authorName}…`}
            onPosted={(reply) => {
              onReplyPosted(reply, comment.id);
              setShowReplyForm(false);
              setRepliesExpanded(true);
            }}
            onCancel={() => setShowReplyForm(false)}
          />
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-8 mt-2 space-y-2.5">
          {!repliesExpanded && (
            <button onClick={() => setRepliesExpanded(true)} className="text-[11px] font-medium" style={{ color: "var(--v-signal)" }}>
              ▾ {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
          )}
          {repliesExpanded && (
            <>
              {replies.map((r) => (
                <CommentRow
                  key={r.id}
                  comment={r}
                  projectId={projectId}
                  onReplyPosted={onReplyPosted}
                  onAcknowledge={onAcknowledge}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isOwner={isOwner}
                  isReply
                  currentUserId={currentUserId}
                />
              ))}
              <button onClick={() => setRepliesExpanded(false)} className="text-[11px]" style={{ color: "var(--v-faint)" }}>▴ Hide replies</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── main CommentSection ── */
export default function CommentSection({ projectId, isOwner = false, onCommentPosted }: CommentSectionProps) {
  const { user } = useUser();
  const currentUserId = user?.id ?? null;
  const [tree, setTree] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/public/comments/${projectId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Omit<Comment, "replies">[]) => {
        if (Array.isArray(data)) {
          setTree(buildTree(data));
          setTotalCount(data.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [projectId]);

  const VISIBLE = 2;
  const visibleRoots = expanded ? tree : tree.slice(0, VISIBLE);
  const hidden = tree.length - VISIBLE;

  function handleTopLevelPosted(comment: Comment) {
    setTree((prev) => [...prev, { ...comment, replies: [] }]);
    setTotalCount((n) => n + 1);
    setShowForm(false);
    setExpanded(true);
    onCommentPosted?.();
  }

  function handleReplyPosted(reply: Comment, parentId: string) {
    setTree((prev) =>
      prev.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c)
    );
    setTotalCount((n) => n + 1);
  }

  function handleAcknowledge(commentId: string) {
    setTree((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, acknowledged: !c.acknowledged, acknowledgedAt: !c.acknowledged ? new Date().toISOString() : null }
          : c
      )
    );
  }

  function handleDelete(commentId: string, parentId: string | null) {
    if (parentId) {
      // Remove reply from its parent
      setTree((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentId) }
            : c
        )
      );
    } else {
      setTree((prev) => prev.filter((c) => c.id !== commentId));
    }
    setTotalCount((n) => n - 1);
  }

  function handleEdit(commentId: string, newBody: string) {
    setTree((prev) =>
      prev.map((c) => {
        if (c.id === commentId) return { ...c, body: newBody };
        return {
          ...c,
          replies: (c.replies ?? []).map((r) =>
            r.id === commentId ? { ...r, body: newBody } : r
          ),
        };
      })
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: "var(--v-faint)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-signal)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-faint)"; }}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm5 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{loaded ? `${totalCount} comment${totalCount !== 1 ? "s" : ""}` : "…"}</span>
        </button>
        {true && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-xs font-medium transition-colors"
            style={{ color: showForm ? "var(--v-signal)" : "var(--v-faint)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--v-signal)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = showForm ? "var(--v-signal)" : "var(--v-faint)"; }}
          >
            {showForm ? "Cancel" : "+ Comment"}
          </button>
        )}
      </div>

      {/* Pending acknowledgement notice for owner */}
      {isOwner && loaded && tree.some((c) => !c.acknowledged) && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--v-amber)" }}>
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
          {tree.filter((c) => !c.acknowledged).length} comment{tree.filter((c) => !c.acknowledged).length !== 1 ? "s" : ""} pending review
        </div>
      )}

      {/* Comments list */}
      {loaded && tree.length > 0 && (
        <div className="px-5 pb-2 space-y-3">
          {visibleRoots.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              projectId={projectId}
              onReplyPosted={handleReplyPosted}
              onAcknowledge={handleAcknowledge}
              onDelete={handleDelete}
              onEdit={handleEdit}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          ))}
          {!expanded && hidden > 0 && (
            <button onClick={() => setExpanded(true)} className="text-xs font-medium" style={{ color: "var(--v-signal)" }}>
              Show {hidden} more ▾
            </button>
          )}
          {expanded && tree.length > VISIBLE && (
            <button onClick={() => setExpanded(false)} className="text-xs" style={{ color: "var(--v-faint)" }}>
              Show less ▴
            </button>
          )}
        </div>
      )}

      {/* Empty state for non-owner */}
      {loaded && tree.length === 0 && !isOwner && (
        <p className="px-5 pb-3 text-xs" style={{ color: "var(--v-faint)" }}>No comments yet. Be the first!</p>
      )}

      {showForm && (
        <div className="px-5 pb-4">
          <CommentForm projectId={projectId} onPosted={handleTopLevelPosted} onCancel={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}
