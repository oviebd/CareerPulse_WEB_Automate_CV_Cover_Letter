export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
      <div className="h-7 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-48 shrink-0 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 space-y-4">
          <div className="h-6 w-32 rounded-md bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
