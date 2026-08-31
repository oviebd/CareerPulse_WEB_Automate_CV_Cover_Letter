import { Skeleton } from '@/components/ui/skeleton';

export default function CVEditLoading() {
  return (
    <div className="mx-auto max-w-[1800px] space-y-4 px-1 pb-24 sm:px-0 md:pb-8">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(200px,0.22fr)_minmax(0,1fr)_minmax(320px,0.42fr)]">
        <Skeleton className="hidden h-[480px] rounded-2xl md:block" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <Skeleton className="hidden h-[560px] rounded-2xl md:block" />
      </div>
    </div>
  );
}
