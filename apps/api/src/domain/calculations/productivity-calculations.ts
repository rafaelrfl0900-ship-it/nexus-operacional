import { round, safeDivide } from "./safe-number";

export function calculateKgPerHour(producedKg: number, productiveMinutes: number): number {
  return round(safeDivide(producedKg, productiveMinutes / 60), 3);
}

export function calculateAverageKgPerDay(producedKg: number, workedDays: number): number {
  return round(safeDivide(producedKg, workedDays), 3);
}
