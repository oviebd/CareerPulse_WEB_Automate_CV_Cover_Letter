export default function NewApplicationLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700" />
            {i < 3 && <div className="h-0.5 w-12 bg-slate-100 dark:bg-slate-800" />}
          </div>
        ))}
      </div>
      {/* Form */}
      <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-32 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-10 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}
