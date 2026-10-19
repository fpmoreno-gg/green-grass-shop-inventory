const palette = ["#2D3C39", "#C1C38B", "#3F6F85", "#C58A24", "#B83A3A", "#66716D"];

export function DonutChart({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let offset = 0;
  const radius = 15.9155; // circumference ~= 100
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 40 40" className="h-32 w-32 -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="transparent" stroke="var(--color-bg-olive-light)" strokeWidth="6" />
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          const circle = (
            <circle
              key={d.label}
              cx="20"
              cy="20"
              r={radius}
              fill="transparent"
              stroke={palette[i % palette.length]}
              strokeWidth="6"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeDashoffset={-offset}
            />
          );
          offset += pct;
          return circle;
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
            <span className="text-text-secondary">{d.label}</span>
            <span className="font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
