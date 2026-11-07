import type { ProjectStatus } from "@/types/project";
import { STATUS_CLASS } from "@/lib/projectMeta";

const LABEL: Record<ProjectStatus, string> = {
  Live: "Live",
  Maintenance: "Maintenance",
  Deprecated: "Deprecated",
};

export default function StatusBadge({ status }: { status: ProjectStatus; size?: "sm" | "md" }) {
  return (
    <span className={`v-status ${STATUS_CLASS[status]}`}>
      <span className="v-led" />
      <span>{LABEL[status]}</span>
    </span>
  );
}
