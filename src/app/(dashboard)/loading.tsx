/**
 * Loading skeleton for the dashboard route group.
 *
 * Displayed by Next.js App Router during navigation transitions
 * while the page component and its data are loading.
 */

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 py-3 max-w-[428px] mx-auto animate-pulse">
      {/* Speed display skeleton */}
      <div className="flex justify-center py-4 w-full">
        <div className="h-20 w-40 rounded-2xl bg-neutral-800/60" />
      </div>

      {/* Road name skeleton */}
      <div className="w-full px-1 pb-3">
        <div className="h-5 w-3/4 rounded bg-neutral-800/60" />
      </div>

      {/* Map skeleton */}
      <div className="w-full pb-3">
        <div className="h-[200px] w-full rounded-xl bg-neutral-800/60" />
      </div>

      {/* Trip metrics grid skeleton */}
      <div className="w-full pb-3 grid grid-cols-2 gap-3">
        <div className="h-16 rounded-lg bg-neutral-800/60" />
        <div className="h-16 rounded-lg bg-neutral-800/60" />
        <div className="h-16 rounded-lg bg-neutral-800/60" />
        <div className="h-16 rounded-lg bg-neutral-800/60" />
      </div>

      {/* Trip controls skeleton */}
      <div className="flex justify-center pb-4">
        <div className="h-14 w-14 rounded-full bg-neutral-800/60" />
      </div>

      {/* Bottom area skeleton */}
      <div className="mt-auto flex items-end justify-between gap-4 pb-2 w-full">
        <div className="h-10 flex-1 rounded bg-neutral-800/60" />
        <div className="h-10 w-10 rounded-full bg-neutral-800/60" />
      </div>
    </div>
  );
}
