export default function CoverLetterEditorLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      {/* Editor + preview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </div>
        <div className="h-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]" />
      </div>
    </div>
  );
}
