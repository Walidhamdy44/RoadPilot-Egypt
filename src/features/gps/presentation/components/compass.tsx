'use client';

import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGPSStore } from '@/features/gps/presentation/hooks/use-gps-store';
import {
  headingToCardinal,
  shortestRotation,
  shouldSuppressHeading,
} from '@/features/gps/domain/haversine';

/**
 * Compass and heading display component.
 *
 * Displays the current heading as a whole integer in degrees (0–359)
 * and a cardinal/intercardinal direction label (N, NE, E, SE, S, SW, W, NW).
 *
 * Animates the compass indicator via the shortest rotational path with
 * ≤ 300ms transition using Framer Motion. Shows "—" and north orientation
 * when insufficient position data is available.
 *
 * Respects the prefers-reduced-motion OS preference by disabling rotation
 * animation and using instant transitions.
 *
 * @validates Requirements 4.1, 4.2, 4.4, 4.5, 19.7
 */
export function Compass() {
  const prefersReducedMotion = useReducedMotion();
  const position = useGPSStore((s) => s.position);
  const lastValidPosition = useGPSStore((s) => s.lastValidPosition);
  const prevRotationRef = useRef(0);

  // Determine heading and whether to suppress updates
  const currentPos = position ?? lastValidPosition;
  const hasHeading = currentPos?.heading !== null && currentPos?.heading !== undefined;
  const isSuppressed = currentPos ? shouldSuppressHeading(currentPos.speedKmh) : true;

  // Heading is available if we have a position with heading and not suppressed,
  // OR if suppressed we retain the last known heading (from lastValidPosition)
  let displayHeading: number | null = null;

  if (currentPos && hasHeading && !isSuppressed) {
    displayHeading = currentPos.heading;
  } else if (isSuppressed && lastValidPosition?.heading !== null && lastValidPosition?.heading !== undefined) {
    // Retain last known heading when speed < 2 km/h (Req 4.5)
    displayHeading = lastValidPosition.heading;
  } else if (!isSuppressed && currentPos?.heading !== null && currentPos?.heading !== undefined) {
    displayHeading = currentPos.heading;
  }

  // Determine if we have insufficient data (Req 4.4)
  const hasInsufficientData = displayHeading === null;

  // Compute the display values
  const headingDegrees = hasInsufficientData ? null : Math.round(displayHeading!) % 360;
  const cardinalDirection = hasInsufficientData ? null : headingToCardinal(displayHeading!);

  // Calculate rotation using shortest path (Req 4.2)
  let targetRotation = 0;
  if (!hasInsufficientData && headingDegrees !== null) {
    const delta = shortestRotation(
      ((prevRotationRef.current % 360) + 360) % 360,
      headingDegrees
    );
    targetRotation = prevRotationRef.current + delta;
    prevRotationRef.current = targetRotation;
  } else {
    // Reset to north when insufficient data
    prevRotationRef.current = 0;
    targetRotation = 0;
  }

  // Animation config: ≤ 300ms transition, respects reduced motion (Req 19.7)
  const transitionConfig = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: 'easeOut' as const };

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="group"
      aria-label="Compass and heading"
    >
      {/* Compass indicator */}
      <div className="relative flex h-12 w-12 items-center justify-center">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: hasInsufficientData ? 0 : -targetRotation }}
          transition={transitionConfig}
          aria-hidden="true"
        >
          {/* Compass needle pointing north */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-sm"
          >
            {/* Outer ring */}
            <circle
              cx="20"
              cy="20"
              r="18"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-zinc-600 dark:text-zinc-400"
            />
            {/* North indicator (red triangle) */}
            <path
              d="M20 4 L23 16 L20 14 L17 16 Z"
              className="fill-red-500"
            />
            {/* South indicator (gray triangle) */}
            <path
              d="M20 36 L17 24 L20 26 L23 24 Z"
              className="fill-zinc-400 dark:fill-zinc-500"
            />
          </svg>
        </motion.div>
        {/* Center dot */}
        <div className="relative z-10 h-2 w-2 rounded-full bg-white dark:bg-zinc-200" />
      </div>

      {/* Heading text display */}
      <div
        className="flex items-baseline gap-1 text-center"
        aria-live="polite"
        aria-atomic="true"
      >
        {hasInsufficientData ? (
          <span className="text-base font-medium text-zinc-400 dark:text-zinc-500">
            —
          </span>
        ) : (
          <>
            <span className="text-base font-semibold tabular-nums text-zinc-100 dark:text-zinc-100">
              {headingDegrees}°
            </span>
            <span className="text-sm font-medium text-zinc-400 dark:text-zinc-400">
              {cardinalDirection}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
