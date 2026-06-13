export default function CVLibraryLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      {/* PageHeader */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-52 rounded-md bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-28 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
      {/* Creation CTAs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
      {/* Filter tabs */}
      <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
      {/* CV card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        ))}
      </div>
    </div>
  );
}
