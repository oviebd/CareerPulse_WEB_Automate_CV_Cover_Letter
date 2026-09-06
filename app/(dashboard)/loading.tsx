export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        <div className="h-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        <div className="h-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
      </div>
    </div>
  );
}
