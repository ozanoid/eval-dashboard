import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-bg-elevated",
        className
      )}
    />
  );
}

export function EvalCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-48" />
      <div className="flex border border-border-subtle rounded-lg overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 py-3 px-3 flex flex-col items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-14" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="space-y-2 pt-3 border-t border-border-subtle">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CriteriaCardSkeleton() {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl px-5 py-4 flex items-center gap-4">
      <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-10" />
      <Skeleton className="h-1.5 w-24 rounded-full" />
      <Skeleton className="h-5 w-12" />
    </div>
  );
}
