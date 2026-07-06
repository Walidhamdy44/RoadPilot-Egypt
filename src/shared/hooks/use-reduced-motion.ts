'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that detects the user's `prefers-reduced-motion` OS preference.
 *
 * Returns `true` when the user has requested reduced motion, `false` otherwise.
 * Listens for changes to the media query and updates reactively.
 *
 * @validates Requirements 19.7
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    // Sync in case SSR value was wrong
    setReducedMotion(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return reducedMotion;
}
