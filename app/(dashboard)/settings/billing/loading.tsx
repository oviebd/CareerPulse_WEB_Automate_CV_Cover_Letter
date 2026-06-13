export default function BillingLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-56 rounded-md bg-slate-100 dark:bg-slate-800" />
      </div>
      {/* Current plan card */}
      <div className="h-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
      {/* Upgrade cards */}
      <div className="space-y-3">
        <div className="h-5 w-32 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
          <div className="h-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
      </div>
      {/* Payment history */}
      <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="h-5 w-36 rounded-md bg-slate-200 dark:bg-slate-700" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
