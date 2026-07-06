/**
 * Loading skeleton for the trips route group.
 *
 * Displayed by Next.js App Router during navigation transitions
 * while the trip list or trip detail page is loading.
 */

export default function TripsLoading() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background px-4 py-6 max-w-[428px] mx-auto animate-pulse">
      {/* Page header skeleton */}
      <div className="pb-6">
        <div className="h-7 w-32 rounded bg-neutral-800/60" />
      </div>

      {/* Trip list items skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border bg-neutral-900/40 p-4"
          >
            {/* Trip date + distance */}
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-neutral-800/60" />
              <div className="h-4 w-16 rounded bg-neutral-800/60" />
            </div>
            {/* Trip route */}
            <div className="h-4 w-3/4 rounded bg-neutral-800/60" />
            {/* Trip metrics */}
            <div className="flex gap-4 pt-1">
              <div className="h-3 w-14 rounded bg-neutral-800/60" />
              <div className="h-3 w-14 rounded bg-neutral-800/60" />
              <div className="h-3 w-14 rounded bg-neutral-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
