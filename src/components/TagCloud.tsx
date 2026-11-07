"use client";

import { useState } from "react";
import type { Project } from "@/types/project";
import { useT } from "@/lib/i18n";

interface TagCloudProps {
  projects: Project[];
  activeTag: string;
  onTagClick: (tag: string) => void;
}

const VISIBLE = 10;

export default function TagCloud({ projects, activeTag, onTagClick }: TagCloudProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const counts = new Map<string, number>();
  for (const p of projects) for (const tech of p.techStack) counts.set(tech, (counts.get(tech) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (sorted.length === 0) return null;

  const shown = expanded ? sorted : sorted.slice(0, VISIBLE);
  // Keep an active tag visible even when collapsed
  if (activeTag && !shown.some(([tag]) => tag === activeTag)) {
    const hit = sorted.find(([tag]) => tag === activeTag);
    if (hit) shown.push(hit);
  }

  return (
    <div className="v-tags" aria-label="Filter by technology">
      <span className="v-mono v-tags-label" style={{ color: "var(--v-faint)" }}>{t("tags.stack")}</span>
      {shown.map(([tag, count]) => (
        <button key={tag} className="v-tag" aria-pressed={activeTag === tag} onClick={() => onTagClick(activeTag === tag ? "" : tag)}>
          {tag}<span className="v-tag-n">{count}</span>
        </button>
      ))}
      {sorted.length > VISIBLE && (
        <button className="v-tag is-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("tags.less") : t("tags.more", { n: sorted.length - VISIBLE })}
        </button>
      )}
    </div>
  );
}
