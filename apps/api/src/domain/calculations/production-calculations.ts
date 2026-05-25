import {
  ProductionCalculationInput,
  ProductionCalculationResult,
  ProductWeightConfig
} from "./types";
import { asFiniteNumber, nonNegative, round, safeDivide } from "./safe-number";

export function calculateProducedKg(boxes: number, config: ProductWeightConfig): number {
  const packedBoxes = nonNegative(asFiniteNumber(boxes));

  if (config.formula === "PACKAGE_WEIGHT") {
    return round(packedBoxes * config.packagesPerBox * config.packageWeightKg, 3);
  }

  return round(packedBoxes * config.boxWeightKg, 3);
}

export function calculateExpectedYieldKg(
  realizedBatches: number,
  massWeightKg: number,
  usedReworkKg = 0
): number {
  return round(nonNegative(realizedBatches) * nonNegative(massWeightKg) + nonNegative(usedReworkKg), 3);
}

export function calculateOverweight(
  producedKg: number,
  packedBoxes: number,
  averagePackageWeightG: number | null | undefined,
  config: ProductWeightConfig
) {
  const average = asFiniteNumber(averagePackageWeightG, config.targetPackageWeightG);
  const overweightGPerPackage = Math.max(average - config.targetPackageWeightG, 0);
  const packageCount = nonNegative(packedBoxes) * nonNegative(config.packagesPerBox);
  const overweightTotalKg = round((overweightGPerPackage * packageCount) / 1000, 3);
  const overweightPercent = round(safeDivide(overweightTotalKg, producedKg), 6);

  return {
    packageCount,
    overweightGPerPackage: round(overweightGPerPackage, 3),
    overweightTotalKg,
    overweightPercent
  };
}

export function calculateProductionEntry(input: ProductionCalculationInput): ProductionCalculationResult {
  const plannedBatches = nonNegative(asFiniteNumber(input.plannedBatches));
  const realizedBatches = nonNegative(asFiniteNumber(input.realizedBatches));
  const packedBoxes = nonNegative(asFiniteNumber(input.packedBoxes));
  const weighingLossKg = nonNegative(asFiniteNumber(input.weighingLossKg));
  const generatedReworkKg = nonNegative(asFiniteNumber(input.generatedReworkKg));
  const usedReworkKg = input.sector === "P1" ? nonNegative(asFiniteNumber(input.usedReworkKg)) : 0;

  const producedKg = calculateProducedKg(packedBoxes, input.weightConfig);
  const expectedYieldKg = calculateExpectedYieldKg(
    realizedBatches,
    input.weightConfig.massWeightKg,
    usedReworkKg
  );
  const realYieldPercent = round(safeDivide(producedKg, expectedYieldKg), 6);
  const overweight = calculateOverweight(
    producedKg,
    packedBoxes,
    input.averagePackageWeightG,
    input.weightConfig
  );

  const inconsistencies: string[] = [];
  if (plannedBatches > 0 && realizedBatches > plannedBatches * 1.1) {
    inconsistencies.push("Realizado acima do planejado em mais de 10%.");
  }
  if (expectedYieldKg === 0 && producedKg > 0) {
    inconsistencies.push("Producao informada sem rendimento esperado calculavel.");
  }
  if (input.weightConfig.targetPackageWeightG <= 0) {
    inconsistencies.push("Produto sem peso alvo de pacote valido.");
  }
  if (input.weightConfig.packagesPerBox <= 0) {
    inconsistencies.push("Produto sem pacotes por caixa valido.");
  }

  return {
    producedKg,
    expectedYieldKg,
    realYieldPercent,
    packageCount: overweight.packageCount,
    overweightGPerPackage: overweight.overweightGPerPackage,
    overweightTotalKg: overweight.overweightTotalKg,
    overweightPercent: overweight.overweightPercent,
    totalLossesKg: round(weighingLossKg + generatedReworkKg + overweight.overweightTotalKg, 3),
    inconsistencies
  };
}
