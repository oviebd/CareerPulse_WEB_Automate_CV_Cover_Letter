export default function OptimiseResultLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-52 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-40 rounded-md bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      {/* Result panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        <div className="space-y-4">
          <div className="h-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
          <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
      </div>
    </div>
  );
}
