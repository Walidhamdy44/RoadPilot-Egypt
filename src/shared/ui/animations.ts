import type { Variants, Transition } from 'framer-motion';

/**
 * Shared Framer Motion animation presets for RoadPilot Egypt.
 *
 * All animations respect the `prefers-reduced-motion` OS preference.
 * When reduced motion is enabled, animations return empty objects (no motion).
 *
 * Usage:
 *   const reducedMotion = useReducedMotion();
 *   <motion.div variants={fadeIn(reducedMotion)} initial="hidden" animate="visible" />
 *
 * @validates Requirements 19.2, 4.2, 18.4, 19.7
 */

// ---------------------------------------------------------------------------
// Transition helper
// ---------------------------------------------------------------------------

/**
 * Returns an appropriate transition config based on reduced motion preference.
 * When reduced motion is enabled, returns instant (duration: 0) transition.
 * Otherwise returns a smooth spring/ease transition.
 */
export function getTransition(reducedMotion: boolean): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    duration: 0.3,
    ease: 'easeOut',
  };
}

// ---------------------------------------------------------------------------
// Fade variants
// ---------------------------------------------------------------------------

/**
 * Fade in from opacity 0 to 1.
 * Max duration: 300ms.
 */
export function fadeIn(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };
}

/**
 * Fade out from opacity 1 to 0.
 * Max duration: 300ms.
 */
export function fadeOut(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      visible: {},
      hidden: {},
    };
  }
  return {
    visible: { opacity: 1 },
    hidden: {
      opacity: 0,
      transition: { duration: 0.3, ease: 'easeIn' },
    },
  };
}

// ---------------------------------------------------------------------------
// Slide variants
// ---------------------------------------------------------------------------

/**
 * Slide up from below (20px offset) with fade.
 * Max duration: 300ms.
 */
export function slideUp(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };
}

/**
 * Slide down from above (-20px offset) with fade.
 * Max duration: 300ms.
 */
export function slideDown(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };
}

// ---------------------------------------------------------------------------
// Scale variants
// ---------------------------------------------------------------------------

/**
 * Scale in from 0.95 to 1 with opacity fade.
 * Max duration: 300ms.
 */
export function scaleIn(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      hidden: {},
      visible: {},
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  };
}

// ---------------------------------------------------------------------------
// Compass rotation
// ---------------------------------------------------------------------------

/**
 * Compass needle rotation animation.
 * Duration ≤ 300ms as per Requirement 4.2.
 *
 * Usage:
 *   <motion.div
 *     animate={{ rotate: targetDegrees }}
 *     transition={compassRotate(reducedMotion)}
 *   />
 */
export function compassRotate(reducedMotion: boolean): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    duration: 0.3,
    ease: 'easeOut',
  };
}

// ---------------------------------------------------------------------------
// Map expand/collapse
// ---------------------------------------------------------------------------

/**
 * Map toggle animation for expanding/collapsing the map view.
 * Duration: 300ms with ease-in-out as per Requirement 18.4.
 *
 * Usage:
 *   <motion.div
 *     variants={mapExpandCollapse(reducedMotion)}
 *     animate={expanded ? 'expanded' : 'collapsed'}
 *   />
 */
export function mapExpandCollapse(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      collapsed: {},
      expanded: {},
    };
  }
  return {
    collapsed: {
      height: '200px',
      borderRadius: '0.75rem',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
    expanded: {
      height: '100vh',
      borderRadius: '0px',
      transition: { duration: 0.3, ease: 'easeInOut' },
    },
  };
}

/**
 * Map expand/collapse transition config (for use with `transition` prop directly).
 * Duration: 300ms ease-in-out as per Requirement 18.4.
 */
export function mapExpandCollapseTransition(reducedMotion: boolean): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    duration: 0.3,
    ease: 'easeInOut',
  };
}

// ---------------------------------------------------------------------------
// Pulse glow (GPS signal indicator)
// ---------------------------------------------------------------------------

/**
 * Pulse glow animation for GPS signal indicator.
 * Creates a repeating scale + opacity pulse effect.
 *
 * Usage:
 *   <motion.div
 *     variants={pulseGlow(reducedMotion)}
 *     animate="pulse"
 *   />
 */
export function pulseGlow(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      pulse: {},
    };
  }
  return {
    pulse: {
      scale: [1, 1.15, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Metric update transition (max 500ms, 60fps)
// ---------------------------------------------------------------------------

/**
 * Transition config for metric value updates (speed, distance, time).
 * Max duration: 500ms as per Requirement 19.2.
 */
export function metricUpdateTransition(reducedMotion: boolean): Transition {
  if (reducedMotion) {
    return { duration: 0 };
  }
  return {
    duration: 0.2,
    ease: 'easeOut',
  };
}
