// Minimal dependency-free SVG bar chart — the spec asks for "simple charts,
// no saturated dashboards", so a small hand-rolled chart avoids pulling in a
// charting library for a handful of bars.
export function BarChart({ data, color = "var(--color-brand-dark)" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-3 h-40">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-32 w-full items-end">
            <div
              className="w-full rounded-t-[6px]"
              style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, minHeight: d.value ? 4 : 0 }}
            />
          </div>
          <span className="text-xs text-text-secondary">{d.label}</span>
          <span className="text-xs font-semibold text-text-primary">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
