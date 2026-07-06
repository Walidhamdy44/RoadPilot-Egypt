import { describe, it, expect } from "vitest";
import {
  calculateAverageSpeed,
  updateMaxSpeed,
  createInitialMaxSpeedRecord,
  MaxSpeedRecord,
} from "@/features/trip/domain/speed-calculator";

describe("calculateAverageSpeed", () => {
  it("returns 0.0 when drivingTimeMs is 0", () => {
    expect(calculateAverageSpeed(100, 0)).toBe(0.0);
  });

  it("returns 0.0 when drivingTimeMs is negative", () => {
    expect(calculateAverageSpeed(100, -1000)).toBe(0.0);
  });

  it("returns 0.0 when distanceKm is 0", () => {
    expect(calculateAverageSpeed(0, 3_600_000)).toBe(0.0);
  });

  it("calculates average speed correctly for 100km in 1 hour", () => {
    // 100 km / (3,600,000 ms / 3,600,000) = 100 km/h
    expect(calculateAverageSpeed(100, 3_600_000)).toBeCloseTo(100.0, 1);
  });

  it("calculates average speed correctly for 50km in 30 minutes", () => {
    // 50 km / (1,800,000 ms / 3,600,000) = 50 / 0.5 = 100 km/h
    expect(calculateAverageSpeed(50, 1_800_000)).toBeCloseTo(100.0, 1);
  });

  it("calculates average speed correctly for 120km in 2 hours", () => {
    // 120 km / (7,200,000 ms / 3,600,000) = 120 / 2 = 60 km/h
    expect(calculateAverageSpeed(120, 7_200_000)).toBeCloseTo(60.0, 1);
  });

  it("caps average speed at 999.9 km/h", () => {
    // 1000 km / (3,600,000 ms / 3,600,000) = 1000 km/h -> capped at 999.9
    expect(calculateAverageSpeed(1000, 3_600_000)).toBe(999.9);
  });

  it("caps at 999.9 for extremely short driving time", () => {
    // 10 km / (1000 ms / 3,600,000) = 10 / 0.000278 = ~36000 km/h -> capped
    expect(calculateAverageSpeed(10, 1000)).toBe(999.9);
  });

  it("does not cap values at or below 999.9", () => {
    // 999.9 km in 1 hour = 999.9 km/h
    const drivingTimeMs = 3_600_000;
    const result = calculateAverageSpeed(999.9, drivingTimeMs);
    expect(result).toBeCloseTo(999.9, 1);
  });

  it("handles very small distances and times", () => {
    // 0.001 km / (1000 ms / 3,600,000) = 0.001 / 0.000278 ≈ 3.6 km/h
    const result = calculateAverageSpeed(0.001, 1000);
    expect(result).toBeCloseTo(3.6, 1);
  });
});

describe("updateMaxSpeed", () => {
  const initialMax = createInitialMaxSpeedRecord();

  it("updates max speed when speed exceeds current max with valid accuracy", () => {
    const result = updateMaxSpeed(
      initialMax,
      120.5,
      15,
      1700000000000,
      { lat: 30.0444, lng: 31.2357 }
    );

    expect(result.speedKmh).toBe(120.5);
    expect(result.timestamp).toBe(1700000000000);
    expect(result.coordinates).toEqual({ lat: 30.0444, lng: 31.2357 });
  });

  it("does not update when speed is below current max", () => {
    const currentMax: MaxSpeedRecord = {
      speedKmh: 150.0,
      timestamp: 1700000000000,
      coordinates: { lat: 30.0, lng: 31.0 },
    };

    const result = updateMaxSpeed(
      currentMax,
      120.0,
      10,
      1700000001000,
      { lat: 30.1, lng: 31.1 }
    );

    expect(result).toBe(currentMax); // Same reference
    expect(result.speedKmh).toBe(150.0);
  });

  it("does not update when speed equals current max", () => {
    const currentMax: MaxSpeedRecord = {
      speedKmh: 120.0,
      timestamp: 1700000000000,
      coordinates: { lat: 30.0, lng: 31.0 },
    };

    const result = updateMaxSpeed(
      currentMax,
      120.0,
      10,
      1700000001000,
      { lat: 30.1, lng: 31.1 }
    );

    expect(result).toBe(currentMax);
  });

  it("discards reading when accuracy > 30 meters", () => {
    const result = updateMaxSpeed(
      initialMax,
      200.0,
      31,
      1700000000000,
      { lat: 30.0444, lng: 31.2357 }
    );

    expect(result).toBe(initialMax);
    expect(result.speedKmh).toBe(0.0);
  });

  it("accepts reading when accuracy is exactly 30 meters", () => {
    const result = updateMaxSpeed(
      initialMax,
      100.0,
      30,
      1700000000000,
      { lat: 30.0444, lng: 31.2357 }
    );

    expect(result.speedKmh).toBe(100.0);
    expect(result.timestamp).toBe(1700000000000);
  });

  it("discards reading when speed > 250 km/h (sensor anomaly)", () => {
    const result = updateMaxSpeed(
      initialMax,
      251.0,
      10,
      1700000000000,
      { lat: 30.0444, lng: 31.2357 }
    );

    expect(result).toBe(initialMax);
    expect(result.speedKmh).toBe(0.0);
  });

  it("accepts reading when speed is exactly 250 km/h", () => {
    const result = updateMaxSpeed(
      initialMax,
      250.0,
      10,
      1700000000000,
      { lat: 30.0444, lng: 31.2357 }
    );

    expect(result.speedKmh).toBe(250.0);
    expect(result.timestamp).toBe(1700000000000);
  });

  it("discards reading with both bad accuracy and high speed", () => {
    const result = updateMaxSpeed(
      initialMax,
      300.0,
      50,
      1700000000000,
      { lat: 30.0, lng: 31.0 }
    );

    expect(result).toBe(initialMax);
  });

  it("records timestamp and coordinates when max is updated", () => {
    const result = updateMaxSpeed(
      initialMax,
      80.0,
      5,
      1700000005000,
      { lat: 29.9, lng: 31.5 }
    );

    expect(result.timestamp).toBe(1700000005000);
    expect(result.coordinates).toEqual({ lat: 29.9, lng: 31.5 });
  });

  it("handles sequential updates correctly", () => {
    let max = createInitialMaxSpeedRecord();

    // First valid reading
    max = updateMaxSpeed(max, 60.0, 10, 1700000000000, { lat: 30.0, lng: 31.0 });
    expect(max.speedKmh).toBe(60.0);

    // Higher reading - should update
    max = updateMaxSpeed(max, 90.0, 15, 1700000001000, { lat: 30.1, lng: 31.1 });
    expect(max.speedKmh).toBe(90.0);
    expect(max.timestamp).toBe(1700000001000);

    // Lower reading - should not update
    max = updateMaxSpeed(max, 70.0, 10, 1700000002000, { lat: 30.2, lng: 31.2 });
    expect(max.speedKmh).toBe(90.0);
    expect(max.timestamp).toBe(1700000001000);

    // High reading with bad accuracy - discarded
    max = updateMaxSpeed(max, 200.0, 35, 1700000003000, { lat: 30.3, lng: 31.3 });
    expect(max.speedKmh).toBe(90.0);

    // Anomalous reading - discarded
    max = updateMaxSpeed(max, 260.0, 5, 1700000004000, { lat: 30.4, lng: 31.4 });
    expect(max.speedKmh).toBe(90.0);

    // New valid max
    max = updateMaxSpeed(max, 130.0, 8, 1700000005000, { lat: 30.5, lng: 31.5 });
    expect(max.speedKmh).toBe(130.0);
    expect(max.timestamp).toBe(1700000005000);
    expect(max.coordinates).toEqual({ lat: 30.5, lng: 31.5 });
  });
});

describe("createInitialMaxSpeedRecord", () => {
  it("initializes speed to 0.0", () => {
    const record = createInitialMaxSpeedRecord();
    expect(record.speedKmh).toBe(0.0);
  });

  it("initializes timestamp to null", () => {
    const record = createInitialMaxSpeedRecord();
    expect(record.timestamp).toBeNull();
  });

  it("initializes coordinates to null", () => {
    const record = createInitialMaxSpeedRecord();
    expect(record.coordinates).toBeNull();
  });
});
