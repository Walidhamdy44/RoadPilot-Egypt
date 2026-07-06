/**
 * Loading skeleton for the analytics route.
 *
 * Displayed by Next.js App Router during navigation transitions
 * while the analytics page component and its data are loading.
 * Provides instant visual feedback to keep perceived performance high.
 */

export default function AnalyticsLoading() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto animate-pulse">
      {/* Page header skeleton */}
      <div className="mb-4">
        <div className="h-7 w-28 rounded bg-neutral-800/60" />
      </div>

      {/* View mode toggle skeleton */}
      <div className="mb-5 flex gap-2">
        <div className="h-9 w-20 rounded-lg bg-neutral-800/60" />
        <div className="h-9 w-20 rounded-lg bg-neutral-800/60" />
      </div>

      {/* Summary cards grid skeleton */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border bg-neutral-900/40 p-3"
          >
            <div className="h-3 w-16 rounded bg-neutral-800/60" />
            <div className="h-5 w-20 rounded bg-neutral-800/60" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-[250px] w-full rounded-xl border border-border bg-neutral-800/40" />
    </div>
  );
}
