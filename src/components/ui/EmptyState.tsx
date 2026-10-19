export function EmptyState({ icon = "📦", title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-subtle py-16 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="font-semibold text-text-primary">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-text-secondary">{subtitle}</p>}
    </div>
  );
}
