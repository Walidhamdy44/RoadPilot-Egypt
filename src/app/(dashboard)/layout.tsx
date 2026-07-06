'use client';

/**
 * Dashboard layout for RoadPilot Egypt.
 *
 * Wraps all dashboard routes with:
 * - AuthGuard (supports local-only mode)
 * - SyncIndicator header bar
 * - Bottom navigation (Home, Trips, Analytics)
 *
 * **Validates: Requirements 17.7, 12.8**
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { AuthGuard } from '@/features/auth/presentation/components/auth-guard';
import { SyncIndicator } from '@/features/sync/presentation/components/sync-indicator';
import { CrashRecovery } from '@/features/trip/presentation/components/crash-recovery';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-[100dvh] flex-col bg-background">
        {/* Header with sync indicator */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-zinc-800/50">
          <span className="text-sm font-semibold text-zinc-200">RoadPilot</span>
          <SyncIndicator />
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto pb-16">
          <CrashRecovery>
            {children}
          </CrashRecovery>
        </main>

        {/* Bottom navigation */}
        <BottomNavigation />
      </div>
    </AuthGuard>
  );
}

/**
 * Bottom navigation bar for dashboard routes.
 * Links: Home (dashboard), Trips (history), Analytics.
 */
function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: HomeIcon,
      isActive: pathname === '/',
    },
    {
      href: '/trips',
      label: 'Trips',
      icon: TripsIcon,
      isActive: pathname.startsWith('/trips'),
    },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: AnalyticsIcon,
      isActive: pathname === '/analytics',
    },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-zinc-800/50 bg-zinc-900/95 backdrop-blur-sm px-2 py-2 safe-area-pb"
      aria-label="Main navigation"
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center gap-0.5 rounded-lg px-4 py-1.5 text-xs font-medium transition-colors min-w-[64px] ${
            item.isActive
              ? 'text-blue-400'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
          aria-current={item.isActive ? 'page' : undefined}
        >
          <item.icon active={item.isActive} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/* ─── Navigation Icons ──────────────────────────────────────── */

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-blue-400' : 'text-zinc-400'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function TripsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-blue-400' : 'text-zinc-400'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
      />
    </svg>
  );
}

function AnalyticsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-blue-400' : 'text-zinc-400'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}
