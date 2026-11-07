"use client";

import React, { type RefObject } from "react";
import type { ProjectStatus } from "@/types/project";
import { ISearch, IX } from "./icons";

export type SortOption = "newest" | "oldest" | "az" | "status";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: ProjectStatus | "";
  onStatusChange: (s: ProjectStatus | "") => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  inputRef?: RefObject<HTMLInputElement>;
  counts?: Record<string, number>;
}

const STATUS_TABS: Array<{ value: ProjectStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "Live", label: "Live" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Deprecated", label: "Deprecated" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "az", label: "A → Z" },
  { value: "status", label: "Status" },
];

export default function SearchBar({ query, onQueryChange, statusFilter, onStatusChange, sort, onSortChange, inputRef, counts }: SearchBarProps) {
  return (
    <div className="v-toolbar">
      <div className="v-tabs" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value || "all"}
            role="tab"
            aria-selected={statusFilter === t.value}
            className="v-tab"
            onClick={() => onStatusChange(t.value)}
          >
            {t.label}
            {counts && <span className="v-tab-count">{String(counts[t.value] ?? 0).padStart(2, "0")}</span>}
          </button>
        ))}
      </div>

      <div className="v-toolbar-right">
        <label className="v-search">
          <ISearch />
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { onQueryChange(""); e.currentTarget.blur(); } }}
            placeholder="Search name, story, stack…"
            className="v-input"
            aria-label="Search projects"
          />
          <span className="v-search-end">
            {query ? (
              <button type="button" onClick={() => onQueryChange("")} className="v-icon-btn" style={{ width: 24, height: 24 }} aria-label="Clear search"><IX /></button>
            ) : (
              <kbd className="v-kbd">/</kbd>
            )}
          </span>
        </label>
        <select value={sort} onChange={(e) => onSortChange(e.target.value as SortOption)} className="v-input" aria-label="Sort projects">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
