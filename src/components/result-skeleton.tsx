import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border/50", className)}
    />
  );
}

export function ResultSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-24">
      {/* header */}
      <div className="space-y-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex items-start gap-3">
          <Bone className="size-8 shrink-0 rounded-sm" />
          <div className="flex-1 space-y-2">
            <Bone className="h-3 w-40" />
            <Bone className="h-7 w-56" />
          </div>
          <Bone className="h-8 w-24 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-12 w-28 rounded-md" />
          ))}
        </div>
        <Bone className="h-4 w-3/4" />
      </div>

      {/* chart + risk rail grid */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <div className="space-y-4">
          {/* OHLC chart */}
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <Bone className="mb-3 h-3 w-48" />
            <Bone className="h-64 w-full rounded-lg" />
          </div>

          {/* horizon cards */}
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <Bone className="mb-4 h-4 w-44" />
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Bone key={i} className="h-28 rounded-lg" />
              ))}
            </div>
            <Bone className="mt-4 h-6 w-full rounded-md" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="h-14 rounded-md" />
              ))}
            </div>
            <Bone className="mt-4 h-40 w-full rounded-lg" />
          </div>

          {/* fingerprint + snapshot */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <Bone className="mb-3 h-3 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Bone key={i} className="h-5 w-full" />
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
              <Bone className="mb-3 h-3 w-24" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Bone key={i} className="h-5 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* risk rail */}
        <div className="hidden space-y-4 lg:block">
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <Bone className="mb-3 h-3 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Bone key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
