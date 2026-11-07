"use client";

import React, { type RefObject } from "react";
import type { ProjectStatus } from "@/types/project";
import { useT, type TKey } from "@/lib/i18n";
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

const STATUS_TABS: Array<{ value: ProjectStatus | ""; label: TKey }> = [
  { value: "", label: "tab.all" },
  { value: "Live", label: "status.Live" },
  { value: "Maintenance", label: "status.Maintenance" },
  { value: "Deprecated", label: "status.Deprecated" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: TKey }> = [
  { value: "newest", label: "sort.newest" },
  { value: "oldest", label: "sort.oldest" },
  { value: "az", label: "sort.az" },
  { value: "status", label: "sort.status" },
];

export default function SearchBar({ query, onQueryChange, statusFilter, onStatusChange, sort, onSortChange, inputRef, counts }: SearchBarProps) {
  const t = useT();
  return (
    <div className="v-toolbar">
      <div className="v-tabs" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value || "all"} role="tab" aria-selected={statusFilter === tab.value} className="v-tab" onClick={() => onStatusChange(tab.value)}>
            {t(tab.label)}
            {counts && <span className="v-tab-count">{String(counts[tab.value] ?? 0).padStart(2, "0")}</span>}
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
            placeholder={t("search.placeholder")}
            className="v-input"
            aria-label={t("search.label")}
          />
          <span className="v-search-end">
            {query ? (
              <button type="button" onClick={() => onQueryChange("")} className="v-icon-btn" style={{ width: 24, height: 24 }} aria-label={t("common.close")}><IX /></button>
            ) : (
              <kbd className="v-kbd">/</kbd>
            )}
          </span>
        </label>
        <select value={sort} onChange={(e) => onSortChange(e.target.value as SortOption)} className="v-input" aria-label="Sort">
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
        </select>
      </div>
    </div>
  );
}
