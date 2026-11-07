"use client";

import { useMemo } from "react";
import type { Project } from "@/types/project";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVELS = ["rgba(var(--v-ink-rgb),0.09)", "rgba(var(--v-c1-rgb),0.35)", "var(--v-c1)", "var(--v-c2)", "var(--v-c3)"];

export default function ActivityHeatmap({ projects }: { projects: Project[] }) {
  const { cells, monthLabels, maxCount, total } = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const day = (p.deploymentDate?.trim() || p.createdAt).slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay()));
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 52 * 7 + 1);

    const cells: { date: string; count: number; col: number; row: number }[] = [];
    const monthLabels: { month: string; col: number }[] = [];
    const d = new Date(startDate);
    let col = 0;
    let lastMonth = -1;
    let total = 0;

    while (d <= endDate) {
      if (d.getDay() === 0 && d.getMonth() !== lastMonth) {
        monthLabels.push({ month: MONTHS[d.getMonth()], col });
        lastMonth = d.getMonth();
      }
      const dateStr = d.toISOString().slice(0, 10);
      const count = counts[dateStr] ?? 0;
      total += count;
      cells.push({ date: dateStr, count, col, row: d.getDay() });
      if (d.getDay() === 6) col++;
      d.setDate(d.getDate() + 1);
    }

    return { cells, monthLabels, maxCount: Math.max(1, ...cells.map((c) => c.count)), total };
  }, [projects]);

  function level(count: number) {
    if (count === 0) return 0;
    return Math.max(1, Math.ceil((count / maxCount) * 4));
  }

  const CELL = 12, GAP = 3, STEP = CELL + GAP;
  const width = 53 * STEP;
  const height = 7 * STEP;

  return (
    <section className="v-heat v-hud v-rise" style={{ animationDelay: "500ms" }} aria-label="Shipping activity over the last year">
      <div className="v-heat-head">
        <span className="v-eyebrow">Shipping activity · 52 weeks</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="v-mono" style={{ color: "var(--v-text)" }}>{String(total).padStart(2, "0")} <span style={{ color: "var(--v-faint)" }}>shipped in 12 months</span></span>
          <span className="v-heat-legend">
            <span className="v-mono" style={{ fontSize: 10, color: "var(--v-faint)", marginRight: 4 }}>Less</span>
            {LEVELS.map((c) => <i key={c} style={{ background: c }} />)}
            <span className="v-mono" style={{ fontSize: 10, color: "var(--v-faint)", marginLeft: 4 }}>More</span>
          </span>
        </div>
      </div>

      <div style={{ overflowX: "auto", scrollbarWidth: "none" }}>
        <svg viewBox={`0 0 ${width} ${height + 18}`} width="100%" style={{ display: "block", minWidth: 640 }}>
          {monthLabels.map(({ month, col }, i) => (
            <text key={i} x={col * STEP} y={10} fontSize={10} fontFamily="Geist Mono, monospace" style={{ fill: "var(--v-faint)" }} letterSpacing="0.5">{month}</text>
          ))}
          <g transform="translate(0,18)">
            {cells.map(({ date, count, col, row }) => (
              <rect key={date} x={col * STEP} y={row * STEP} width={CELL} height={CELL} rx={3} style={{ fill: LEVELS[level(count)] }}>
                <title>{date}: {count} project{count !== 1 ? "s" : ""}</title>
              </rect>
            ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
