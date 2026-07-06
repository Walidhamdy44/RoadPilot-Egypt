/**
 * Layout for authentication pages (login, register).
 *
 * Provides a centered, gradient background container
 * with dark-mode-first design.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      {children}
    </div>
  );
}
