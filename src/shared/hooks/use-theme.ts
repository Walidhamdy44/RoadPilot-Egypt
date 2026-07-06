'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'roadpilot-theme';

/**
 * Resolves the effective theme (dark or light) from a preference value.
 * When set to 'system', checks the OS media query.
 */
function resolveTheme(preference: Theme): 'dark' | 'light' {
  if (preference === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return preference;
}

/**
 * Applies the resolved theme to the <html> element by toggling the 'dark' class
 * and updating color-scheme. This runs synchronously to avoid FOUC.
 */
function applyTheme(resolved: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

/**
 * Reads the persisted theme preference from localStorage.
 * Defaults to 'dark' (dark-mode-first design).
 */
function getStoredPreference(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g., private browsing in some browsers)
  }
  return 'dark';
}

/**
 * Persists the theme preference to localStorage.
 */
function storePreference(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Silently fail if storage is unavailable
  }
}

// --- External store for theme state ---
type Listener = () => void;
let listeners: Listener[] = [];
let currentPreference: Theme = 'dark';
let currentResolved: 'dark' | 'light' = 'dark';
let initialized = false;

function initializeStore() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  currentPreference = getStoredPreference();
  currentResolved = resolveTheme(currentPreference);
  applyTheme(currentResolved);

  // Listen for system theme changes when preference is 'system'
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (currentPreference === 'system') {
      const newResolved = resolveTheme('system');
      if (newResolved !== currentResolved) {
        currentResolved = newResolved;
        applyTheme(currentResolved);
        emitChange();
      }
    }
  });
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener): () => void {
  initializeStore();
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): { preference: Theme; resolved: 'dark' | 'light' } {
  initializeStore();
  return { preference: currentPreference, resolved: currentResolved };
}

function getServerSnapshot(): { preference: Theme; resolved: 'dark' | 'light' } {
  return { preference: 'dark', resolved: 'dark' };
}

/**
 * Hook that manages theme preference (dark/light/system), persists to localStorage,
 * and toggles the `dark` class on <html>. Applies within a single frame (no full reload).
 *
 * @returns {object} Theme state and controls
 * - `theme` — The user's preference: 'dark' | 'light' | 'system'
 * - `resolvedTheme` — The effective applied theme: 'dark' | 'light'
 * - `setTheme` — Sets the preference and applies immediately
 * - `toggleTheme` — Cycles through dark → light → system
 */
export function useTheme() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((theme: Theme) => {
    currentPreference = theme;
    currentResolved = resolveTheme(theme);
    applyTheme(currentResolved);
    storePreference(theme);
    emitChange();
  }, []);

  const toggleTheme = useCallback(() => {
    const cycle: Theme[] = ['dark', 'light', 'system'];
    const currentIndex = cycle.indexOf(currentPreference);
    const nextIndex = (currentIndex + 1) % cycle.length;
    setTheme(cycle[nextIndex]);
  }, [setTheme]);

  // Ensure the DOM matches on initial mount (handles SSR mismatch)
  useEffect(() => {
    initializeStore();
    applyTheme(currentResolved);
  }, []);

  return {
    theme: state.preference,
    resolvedTheme: state.resolved,
    setTheme,
    toggleTheme,
  };
}
