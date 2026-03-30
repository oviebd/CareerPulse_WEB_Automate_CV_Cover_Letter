export default function TrackerLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-64 w-64 shrink-0 rounded-xl border border-[var(--color-border)] bg-slate-50"
          />
        ))}
      </div>
    </div>
  );
}
