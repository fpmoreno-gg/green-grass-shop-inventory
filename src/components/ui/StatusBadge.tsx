import type { ToolStatus } from "../../types/models";

// Semantic colors communicate state — never the brand palette (spec section 5).
// Icon + text + color together, never color alone (accessibility rule).
const statusMeta: Record<ToolStatus, { label: string; dot: string; icon: string }> = {
  available: { label: "Available", dot: "bg-success", icon: "🟢" },
  checked_out: { label: "Checked Out", dot: "bg-info", icon: "🔵" },
  repair: { label: "Needs Repair", dot: "bg-error", icon: "🔴" },
  retired: { label: "Retired", dot: "bg-text-disabled", icon: "⚪" },
};

export function StatusBadge({ status }: { status: ToolStatus }) {
  const meta = statusMeta[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-olive-light px-2.5 py-1 text-xs font-medium text-text-primary">
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}

export function Pill({ tone, children }: { tone: "success" | "warning" | "error" | "info"; children: string }) {
  const toneClasses: Record<typeof tone, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
    info: "bg-info/10 text-info",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>;
}
