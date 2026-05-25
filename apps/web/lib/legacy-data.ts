import legacyDataJson from "./legacy-data.json";

export interface LegacyWeek {
  id: string;
  year: number;
  month: number;
  weekNumber: number;
  label: string;
  startsOn: string;
  endsOn: string;
  status: "OPEN" | "REVIEW" | "CLOSED" | "ARCHIVED";
}

export interface LegacyProduct {
  id: string;
  code: string;
  name: string;
  active: boolean;
  defaultSector?: { code: "P1" | "P2" };
  weightConfig?: {
    formula: "BOX_WEIGHT" | "PACKAGE_WEIGHT";
    packageWeightKg: number;
    boxWeightKg: number;
    packagesPerBox: number;
    massWeightKg: number;
    targetPackageWeightG: number;
    overweightTolerancePercent: number;
  } | null;
}

export interface LegacyProductionEntry {
  id: string;
  weekId: string;
  weekNumber: number;
  sector: "P1" | "P2";
  date: string;
  productId: string;
  product?: { code: string; name: string };
  productionOrder: string;
  plannedBatches: number;
  realizedBatches: number;
  packedBoxes: number;
  producedKg: number;
  weighingLossKg: number;
  generatedReworkKg: number;
  expectedYieldKg: number;
  realYieldPercent: number;
  overweightTotalKg: number;
  overweightPercent: number;
  status: string;
}

export interface LegacyLossEntry {
  id: string;
  weekId: string;
  date: string;
  quantityKg: number;
  reason?: string | null;
  sector?: { code: string } | null;
  lossType?: { name: string };
}

export interface LegacyDowntimeEntry {
  id: string;
  weekId: string;
  date: string;
  stoppedMinutes: number;
  stoppedPercent: number;
  status: string;
  sector?: { code: string };
  reason?: { name: string };
}

export interface LegacyData {
  source: string;
  sheetCount: number;
  formulaCount: number;
  errors: Record<string, number>;
  importErrors: Array<{ sheetName?: string; cell?: string; message: string }>;
  products: LegacyProduct[];
  weeks: LegacyWeek[];
  lossTypes: Array<{ id: string; code: string; name: string }>;
  downtimeReasons: Array<{ id: string; name: string }>;
  productionEntries: LegacyProductionEntry[];
  lossEntries: LegacyLossEntry[];
  downtimeEntries: LegacyDowntimeEntry[];
  overweightRanking: Array<{
    productId: string;
    code: string;
    product: string;
    sector: string;
    overweightKg: number;
    producedKg: number;
    overweightPercent: number;
    tolerancePercent: number;
    status: string;
  }>;
  productivitySummary: {
    producedKg: number;
    averageYield: number;
    workedDays: number;
    averageKgPerDay: number;
    records: number;
    daily: Array<{ date: string; producedKg: number; averageYield: number }>;
  };
  dashboard: {
    producedKg: number;
    lossesKg: number;
    overweightKg: number;
    overweightPercent: number;
    averageYield: number;
    downtimeMinutes: number;
  };
  sheetSummary: Array<{ name: string; formulas: number; nonEmpty: number; errors: Record<string, number> }>;
}

export const legacyData = legacyDataJson as unknown as LegacyData;
export const legacyProducts = legacyData.products;
export const legacyWeeks = legacyData.weeks;
export const legacyLossTypes = legacyData.lossTypes;
export const legacyDowntimeReasons = legacyData.downtimeReasons;
export const legacyProductionEntries = legacyData.productionEntries;
export const legacyLossEntries = legacyData.lossEntries;
export const legacyDowntimeEntries = legacyData.downtimeEntries;
export const legacyOverweightRanking = legacyData.overweightRanking;
export const legacyProductivitySummary = legacyData.productivitySummary;

export function preferredLegacyWeekId() {
  return legacyWeeks.find((week) => week.status === "OPEN")?.id ?? legacyWeeks[0]?.id ?? "";
}
