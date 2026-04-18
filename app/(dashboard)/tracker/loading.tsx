export default function TrackerLoading() {
  return (
    <div className="mx-auto w-full max-w-[1000px] animate-pulse space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 max-w-full rounded-lg bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-slate-200" />
          <div className="h-9 w-32 rounded-lg bg-slate-200" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 rounded-full bg-slate-200"
          />
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface-faint)] p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 w-full rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
