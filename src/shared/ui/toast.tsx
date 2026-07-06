"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ─── Toast Variants ──────────────────────────────────────────── */

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all",
  {
    variants: {
      variant: {
        success:
          "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
        error:
          "border-destructive/30 bg-destructive/10 text-destructive dark:text-red-300",
        info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

/* ─── Toast Types ─────────────────────────────────────────────── */

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

/* ─── Toast Context ───────────────────────────────────────────── */

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/* ─── Toast Provider ──────────────────────────────────────────── */

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (message: string, variant: ToastVariant = "info", duration = 5000) => {
      const id = `toast-${++toastCounter}`;
      const toast: Toast = { id, message, variant, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const value = React.useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

/* ─── Toast Viewport ──────────────────────────────────────────── */

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 left-4 z-[100] flex flex-col gap-2 sm:left-auto sm:w-[360px]"
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* ─── Toast Item ──────────────────────────────────────────────── */

interface ToastItemProps extends VariantProps<typeof toastVariants> {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem = React.forwardRef<HTMLDivElement, ToastItemProps>(
  ({ toast, onDismiss }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant: toast.variant }))}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dismiss notification"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }
);

ToastItem.displayName = "ToastItem";

export { ToastItem, toastVariants };
