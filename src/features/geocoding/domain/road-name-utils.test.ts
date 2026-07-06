import { describe, it, expect } from 'vitest';
import { truncateRoadName, buildUnknownRoadText } from './road-name-utils';
import { MAX_ROAD_NAME_LENGTH } from './geocoder-types';

describe('truncateRoadName', () => {
  it('returns short names unchanged', () => {
    const name = 'Cairo-Alexandria Highway';
    expect(truncateRoadName(name)).toBe(name);
  });

  it('returns names exactly at 60 chars unchanged', () => {
    const name = 'A'.repeat(60);
    expect(truncateRoadName(name)).toBe(name);
    expect(truncateRoadName(name).length).toBe(MAX_ROAD_NAME_LENGTH);
  });

  it('truncates names exceeding 60 chars to 57 + "..."', () => {
    const name = 'A'.repeat(80);
    const result = truncateRoadName(name);

    expect(result.length).toBe(MAX_ROAD_NAME_LENGTH);
    expect(result).toBe('A'.repeat(57) + '...');
  });

  it('truncates a 61-character name', () => {
    const name = 'A'.repeat(61);
    const result = truncateRoadName(name);

    expect(result.length).toBe(60);
    expect(result.endsWith('...')).toBe(true);
  });

  it('handles empty string', () => {
    expect(truncateRoadName('')).toBe('');
  });

  it('handles single character', () => {
    expect(truncateRoadName('A')).toBe('A');
  });

  it('preserves Arabic characters in truncation', () => {
    const arabicName = 'طريق القاهرة الإسكندرية الصحراوي الشمالي الجديد المطور المحسن المتقدم';
    const result = truncateRoadName(arabicName);

    expect(result.length).toBeLessThanOrEqual(MAX_ROAD_NAME_LENGTH);
    if (arabicName.length > MAX_ROAD_NAME_LENGTH) {
      expect(result.endsWith('...')).toBe(true);
    }
  });

  it('does not add ellipsis to names at the boundary', () => {
    const name = 'X'.repeat(59);
    expect(truncateRoadName(name)).toBe(name);
    expect(truncateRoadName(name).endsWith('...')).toBe(false);
  });
});

describe('buildUnknownRoadText', () => {
  it('formats with 6 decimal places', () => {
    const result = buildUnknownRoadText(30.04442, 31.235712);
    expect(result).toBe('Unknown Road (30.044420, 31.235712)');
  });

  it('pads short decimals to 6 places', () => {
    const result = buildUnknownRoadText(30, 31);
    expect(result).toBe('Unknown Road (30.000000, 31.000000)');
  });

  it('handles negative coordinates', () => {
    const result = buildUnknownRoadText(-33.8688, 151.2093);
    expect(result).toBe('Unknown Road (-33.868800, 151.209300)');
  });

  it('handles zero coordinates', () => {
    const result = buildUnknownRoadText(0, 0);
    expect(result).toBe('Unknown Road (0.000000, 0.000000)');
  });
});
