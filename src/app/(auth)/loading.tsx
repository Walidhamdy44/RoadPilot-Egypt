/**
 * Loading skeleton for the authentication route group.
 *
 * Displayed by Next.js App Router during navigation transitions
 * while login/register pages are loading.
 */

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      <div className="w-full max-w-sm animate-pulse">
        {/* Card skeleton */}
        <div className="rounded-2xl border border-border bg-card p-6">
          {/* Logo / heading skeleton */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-neutral-800/60" />
            <div className="h-6 w-32 rounded bg-neutral-800/60" />
          </div>

          {/* Form fields skeleton */}
          <div className="flex flex-col gap-4">
            <div className="h-10 w-full rounded-lg bg-neutral-800/60" />
            <div className="h-10 w-full rounded-lg bg-neutral-800/60" />
            <div className="h-10 w-full rounded-lg bg-blue-600/30" />
          </div>

          {/* Footer link skeleton */}
          <div className="mt-4 flex justify-center">
            <div className="h-4 w-40 rounded bg-neutral-800/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
