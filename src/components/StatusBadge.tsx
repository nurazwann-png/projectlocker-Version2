"use client";

import type { ProjectStatus } from "@/types/project";
import { STATUS_CLASS } from "@/lib/projectMeta";
import { useT } from "@/lib/i18n";

export default function StatusBadge({ status }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const t = useT();
  return (
    <span className={`v-status ${STATUS_CLASS[status]}`}>
      <span className="v-led" />
      <span>{t(`status.${status}`)}</span>
    </span>
  );
}
