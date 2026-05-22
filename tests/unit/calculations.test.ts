import { describe, expect, it } from "vitest";
import { calculateProductionEntry } from "../../apps/api/src/domain/calculations/production-calculations";
import { calculateDowntime } from "../../apps/api/src/domain/calculations/downtime-calculations";

const weightConfig = {
  formula: "BOX_WEIGHT" as const,
  packageWeightKg: 1,
  boxWeightKg: 12,
  packagesPerBox: 12,
  massWeightKg: 511,
  targetPackageWeightG: 1000,
  overweightTolerancePercent: 0.02
};

describe("production calculations", () => {
  it("calculates P1 output, yield and overweight without unsafe numbers", () => {
    const result = calculateProductionEntry({
      sector: "P1",
      plannedBatches: 31,
      realizedBatches: 31,
      packedBoxes: 1318,
      weighingLossKg: 31.98,
      averagePackageWeightG: 1009,
      weightConfig
    });

    expect(result.producedKg).toBe(15816);
    expect(result.expectedYieldKg).toBe(15841);
    expect(result.overweightGPerPackage).toBe(9);
    expect(result.overweightTotalKg).toBe(142.344);
    expect(Number.isFinite(result.realYieldPercent)).toBe(true);
  });

  it("returns zero instead of Infinity or NaN when expected yield is zero", () => {
    const result = calculateProductionEntry({
      sector: "P2",
      plannedBatches: 0,
      realizedBatches: 0,
      packedBoxes: 10,
      weightConfig: { ...weightConfig, massWeightKg: 0 }
    });
    expect(result.realYieldPercent).toBe(0);
    expect(Number.isFinite(result.realYieldPercent)).toBe(true);
  });
});

describe("downtime calculations", () => {
  it("classifies downtime by stopped percentage", () => {
    const result = calculateDowntime({
      productionStart: new Date("2026-05-14T08:00:00"),
      productionEnd: new Date("2026-05-14T16:00:00"),
      downtimeStart: new Date("2026-05-14T10:00:00"),
      downtimeEnd: new Date("2026-05-14T10:36:00"),
      producedMassKg: 7584
    });
    expect(result.stoppedMinutes).toBe(36);
    expect(result.status).toBe("MEDIUM");
    expect(Number.isFinite(result.possibleKgHour)).toBe(true);
  });
});
