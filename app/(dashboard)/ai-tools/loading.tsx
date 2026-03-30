export default function AIToolsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded-lg bg-slate-200" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-slate-100" />
    </div>
  );
}
