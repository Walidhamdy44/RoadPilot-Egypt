/**
 * fast-check global configuration for property-based testing.
 *
 * Configured with:
 * - 100 iterations minimum per property
 * - Seed-based reproducibility (set FC_SEED env var to reproduce)
 * - Shrinking enabled (default)
 */
import fc from 'fast-check'

const seed = process.env.FC_SEED ? parseInt(process.env.FC_SEED, 10) : undefined

fc.configureGlobal({
  numRuns: 100,
  ...(seed !== undefined && { seed }),
  // Shrinking is enabled by default in fast-check.
  // Setting endOnFailure to false ensures shrinking runs fully.
  endOnFailure: false,
})

export { fc }

/**
 * Helper to run a property-based test with consistent configuration.
 * Wraps fc.assert with project defaults and optional overrides.
 */
export function runProperty<T>(
  property: fc.IAsyncProperty<T> | fc.IProperty<T>,
  params?: fc.Parameters<T>
): Promise<void> | void {
  return fc.assert(property, {
    numRuns: 100,
    ...(seed !== undefined && { seed }),
    ...params,
  })
}
