"use client";

import { useState } from "react";
import type { Project } from "@/types/project";

interface TagCloudProps {
  projects: Project[];
  activeTag: string;
  onTagClick: (tag: string) => void;
}

const VISIBLE = 10;

export default function TagCloud({ projects, activeTag, onTagClick }: TagCloudProps) {
  const [expanded, setExpanded] = useState(false);

  const counts = new Map<string, number>();
  for (const p of projects) for (const t of p.techStack) counts.set(t, (counts.get(t) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (sorted.length === 0) return null;

  const shown = expanded ? sorted : sorted.slice(0, VISIBLE);
  // Keep an active tag visible even when collapsed
  if (activeTag && !shown.some(([t]) => t === activeTag)) {
    const hit = sorted.find(([t]) => t === activeTag);
    if (hit) shown.push(hit);
  }

  return (
    <div className="v-tags" aria-label="Filter by technology">
      <span className="v-mono v-tags-label" style={{ color: "var(--v-faint)" }}>Stack</span>
      {shown.map(([tag, count]) => (
        <button key={tag} className="v-tag" aria-pressed={activeTag === tag} onClick={() => onTagClick(activeTag === tag ? "" : tag)}>
          {tag}<span className="v-tag-n">{count}</span>
        </button>
      ))}
      {sorted.length > VISIBLE && (
        <button className="v-tag is-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `+${sorted.length - VISIBLE} more`}
        </button>
      )}
    </div>
  );
}
