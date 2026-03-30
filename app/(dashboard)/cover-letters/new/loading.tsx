export default function NewCoverLetterLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-48 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
        <div className="h-96 rounded-xl border border-[var(--color-border)] bg-slate-50" />
      </div>
    </div>
  );
}
