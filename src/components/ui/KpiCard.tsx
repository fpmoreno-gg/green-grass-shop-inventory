import { Card } from "./Card";

export function KpiCard({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "warning" | "error" }) {
  const toneClass = tone === "warning" ? "text-warning" : tone === "error" ? "text-error" : "text-brand-dark";
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`text-[32px] font-bold leading-none ${toneClass}`}>{value}</span>
    </Card>
  );
}
