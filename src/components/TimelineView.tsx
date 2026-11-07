"use client";

import type { Project } from "@/types/project";
import StatusBadge from "./StatusBadge";
import Cover from "./Cover";
import { STATUS_CLASS, formatDate } from "@/lib/projectMeta";
import { IEdit } from "./icons";
import { useT } from "@/lib/i18n";

interface TimelineViewProps {
  projects: Project[];
  onCardClick?: (project: Project) => void;
  onEdit: (project: Project) => void;
}

export default function TimelineView({ projects, onCardClick, onEdit }: TimelineViewProps) {
  const t = useT();
  const sorted = [...projects].sort((a, b) => (b.deploymentDate || b.createdAt).localeCompare(a.deploymentDate || a.createdAt));
  if (sorted.length === 0) return null;

  const groups: { year: string; items: Project[] }[] = [];
  for (const p of sorted) {
    const y = (p.deploymentDate || p.createdAt).slice(0, 4) || "—";
    const g = groups[groups.length - 1];
    if (g && g.year === y) g.items.push(p);
    else groups.push({ year: y, items: [p] });
  }

  let n = 0;
  return (
    <div>
      {groups.map((g) => (
        <section key={g.year} style={{ marginBottom: 32 }}>
          <div className="v-tl-year">
            <h3>{g.year}</h3>
            <span className="v-mono" style={{ color: "var(--v-faint)" }}>{t("tl.shipped", { n: g.items.length })}</span>
          </div>
          {g.items.map((project) => {
            const delay = Math.min(n++, 12) * 50;
            const date = formatDate(project.deploymentDate || project.createdAt, { year: false });
            return (
              <div key={project.id} className="v-tl-item" style={{ animationDelay: `${delay}ms` }}>
                <div className="v-tl-date">{date}</div>
                <div className="v-tl-rail"><span className={`v-tl-node ${STATUS_CLASS[project.status]}`} /></div>
                <div
                  className="v-tl-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onCardClick?.(project)}
                  onKeyDown={(e) => { if (e.key === "Enter") onCardClick?.(project); }}
                >
                  <div className="v-tl-thumb"><Cover name={project.name} src={project.thumbnail} liveUrl={project.liveUrl} showCode={false} /></div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <StatusBadge status={project.status} />
                      <span className="v-card-no v-tl-mobile-date">{date}</span>
                    </div>
                    <h4 className="v-tl-title" style={{ marginTop: 10 }}>{project.name}</h4>
                    <p className="v-card-desc" style={{ marginTop: 6, WebkitLineClamp: 1 }}>{project.description || t("card.noDesc")}</p>
                    {project.techStack.length > 0 && (
                      <div className="v-row-stack" style={{ marginTop: 10 }}>{project.techStack.join("  /  ")}</div>
                    )}
                  </div>
                  <button className="v-icon-btn" style={{ alignSelf: "flex-start" }} onClick={(e) => { e.stopPropagation(); onEdit(project); }} aria-label={t("card.edit")} title={t("card.edit")}><IEdit /></button>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
