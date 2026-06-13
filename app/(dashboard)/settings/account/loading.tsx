export default function AccountSettingsLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-8 animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-9 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="space-y-2">
        <div className="h-5 w-32 rounded-md bg-slate-200 dark:bg-slate-700" />
        <div className="h-9 w-36 rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
