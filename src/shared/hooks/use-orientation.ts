'use client';

import { useState, useEffect, useCallback } from 'react';

export type Orientation = 'portrait' | 'landscape';

interface UseOrientationResult {
  /** Current device orientation */
  orientation: Orientation;
  /** Whether the device is in portrait mode */
  isPortrait: boolean;
  /** Whether the device is in landscape mode */
  isLandscape: boolean;
}

/**
 * Hook that detects device orientation (portrait/landscape) via
 * `window.matchMedia('(orientation: portrait)')`.
 *
 * Falls back to 'portrait' during SSR or when matchMedia is unavailable.
 */
export function useOrientation(): UseOrientationResult {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  const getOrientation = useCallback((): Orientation => {
    if (typeof window === 'undefined') return 'portrait';
    const mq = window.matchMedia('(orientation: portrait)');
    return mq.matches ? 'portrait' : 'landscape';
  }, []);

  useEffect(() => {
    // Set initial orientation on mount
    setOrientation(getOrientation());

    const mq = window.matchMedia('(orientation: portrait)');

    const handleChange = (e: MediaQueryListEvent) => {
      setOrientation(e.matches ? 'portrait' : 'landscape');
    };

    mq.addEventListener('change', handleChange);
    return () => {
      mq.removeEventListener('change', handleChange);
    };
  }, [getOrientation]);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
  };
}
