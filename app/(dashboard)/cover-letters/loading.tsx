export default function CoverLettersLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-9 w-28 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      {/* Creation cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        ))}
      </div>
      {/* List skeleton */}
      <ul className="space-y-3">
        {[1, 2, 3].map((i) => (
          <li key={i} className="h-[72px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        ))}
      </ul>
    </div>
  );
}
