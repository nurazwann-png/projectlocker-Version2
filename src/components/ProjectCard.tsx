"use client";

import { useRef, useState } from "react";
import type { Project } from "@/types/project";
import StatusBadge from "./StatusBadge";
import Cover from "./Cover";
import { formatDate, healthColor, healthScore, pad } from "@/lib/projectMeta";
import { IArrowUpRight, ICamera, ICheck, ICopy, IEdit, IGithub, IPin, IPlus, ITrash } from "./icons";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
  activeTagFilter?: string;
  onDuplicate?: (project: Project) => void;
  onCardClick?: (project: Project) => void;
  onPin?: (id: string) => void;
  onThumbnailChange?: (id: string, url: string | null) => void;
  onView?: (id: string) => void;
  index?: number;
  number?: number;
  readOnly?: boolean;
  selectMode?: boolean;
  selected?: boolean;
}

async function compressThumbnail(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / bitmap.width, 720 / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProjectCard({
  project, onEdit, onDelete, onTagClick, activeTagFilter, onDuplicate, onCardClick, onPin, onThumbnailChange, onView,
  index = 0, number, readOnly = false, selectMode = false, selected = false,
}: ProjectCardProps) {
  const score = healthScore(project);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const hasLiveUrl = Boolean(project.liveUrl && /^https?:\/\//i.test(project.liveUrl));
  const hasRepoUrl = Boolean(project.repoUrl && /^https?:\/\//i.test(project.repoUrl));
  const no = pad(number ?? index + 1, 3);

  async function handleThumbnailPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onThumbnailChange) return;
    setUploading(true);
    try {
      onThumbnailChange(project.id, await compressThumbnail(file));
    } catch {
      // keep existing thumbnail
    } finally {
      setUploading(false);
    }
  }

  function trackPointer(e: React.MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <article
      className={`v-card${selected ? " is-selected" : ""}`}
      style={{ animationDelay: `${Math.min(index, 10) * 70}ms`, cursor: onCardClick ? "pointer" : "default" }}
      onClick={() => onCardClick?.(project)}
      onMouseMove={trackPointer}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onCardClick?.(project); }}
      aria-label={`${project.name}, ${project.status}`}
    >
      <div className="v-card-media">
        <Cover name={project.name} src={project.thumbnail} />

        <div className="v-card-over">
          {selectMode ? (
            <span className={`v-check${selected ? " is-on" : ""}`} aria-hidden>{selected && <ICheck />}</span>
          ) : project.pinned ? (
            <span className="v-pinned"><IPin /> Pinned</span>
          ) : <span />}

          {!readOnly && !selectMode && (
            <div className="v-card-tools" onClick={(e) => e.stopPropagation()}>
              {onPin && (
                <button className={`v-icon-btn${project.pinned ? " is-on" : ""}`} onClick={() => onPin(project.id)} aria-label={project.pinned ? "Unpin" : "Pin"} title={project.pinned ? "Unpin" : "Pin to top"}><IPin /></button>
              )}
              <button className="v-icon-btn" onClick={() => onEdit(project)} aria-label="Edit" title="Edit"><IEdit /></button>
              {onDuplicate && <button className="v-icon-btn" onClick={() => onDuplicate(project)} aria-label="Duplicate" title="Duplicate"><ICopy /></button>}
              <button className="v-icon-btn is-danger" onClick={() => onDelete(project.id)} aria-label="Delete" title="Delete"><ITrash /></button>
            </div>
          )}
        </div>

        {!readOnly && !selectMode && onThumbnailChange && (
          <button
            className="v-card-photo"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            disabled={uploading}
          >
            <ICamera /> {uploading ? "Uploading…" : project.thumbnail ? "Replace cover" : "Add cover"}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailPick} />
      </div>

      <div className="v-card-body">
        <div className="v-card-meta">
          <div className="v-card-meta-left">
            <span className="v-card-no">№{no}</span>
            <StatusBadge status={project.status} />
          </div>
          <span className="v-health" title={`Health score ${score}/100`}>
            <span className="v-health-bar"><i style={{ width: `${score}%`, background: healthColor(score) }} /></span>
            <span className="v-card-no" style={{ color: "var(--v-muted)" }}>{score}</span>
          </span>
        </div>

        <h3 className="v-card-title">{project.name}</h3>
        <p className="v-card-desc">{project.description || "No description yet."}</p>

        {project.techStack.length > 0 && (
          <div className="v-card-stack">
            {project.techStack.slice(0, 5).map((tag, i) => (
              <span key={tag} style={{ display: "inline-flex" }}>
                {i > 0 && <span className="sep">/</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); onTagClick?.(activeTagFilter === tag ? "" : tag); }}
                  aria-pressed={activeTagFilter === tag}
                  title={activeTagFilter === tag ? `Clear "${tag}" filter` : `Filter by ${tag}`}
                >{tag}</button>
              </span>
            ))}
            {project.techStack.length > 5 && <><span className="sep">/</span><span>+{project.techStack.length - 5}</span></>}
          </div>
        )}

        <div className="v-card-foot-wrap" style={{ marginTop: "auto" }}>
          <div className="v-card-foot">
            <span className="v-card-no">{formatDate(project.deploymentDate)}</span>
            <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
              {!readOnly && hasRepoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="v-link" onClick={() => onView?.(project.id)} aria-label="Open repository"><IGithub /></a>
              )}
              {hasLiveUrl ? (
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="v-link is-solid" onClick={() => onView?.(project.id)}>
                  Visit <IArrowUpRight />
                </a>
              ) : !readOnly && project.status === "Live" ? (
                <button className="v-link is-dashed" onClick={() => onEdit(project)}><IPlus /> Add URL</button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
