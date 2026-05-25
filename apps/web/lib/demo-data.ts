import { legacyData, legacyDowntimeEntries, legacyOverweightRanking, legacyProductivitySummary } from "@/lib/legacy-data";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export const kpis = [
  { label: "Producao total", value: legacyData.dashboard.producedKg, suffix: "kg", status: "OK" },
  { label: "Perdas totais", value: legacyData.dashboard.lossesKg, suffix: "kg", status: legacyData.dashboard.lossesKg > 50 ? "ATTENTION" : "OK" },
  { label: "Sobrepeso total", value: legacyData.dashboard.overweightKg, suffix: "kg", status: legacyData.dashboard.overweightKg > 100 ? "ATTENTION" : "OK" },
  { label: "Sobrepeso medio", value: legacyData.dashboard.overweightPercent, suffix: "%", status: legacyData.dashboard.overweightPercent > 0.02 ? "ATTENTION" : "OK" },
  { label: "Rendimento medio", value: legacyData.dashboard.averageYield, suffix: "%", status: legacyData.dashboard.averageYield >= 0.95 ? "OK" : "ATTENTION" },
  { label: "Tempo parado", value: legacyData.dashboard.downtimeMinutes, suffix: "min", status: legacyData.dashboard.downtimeMinutes > 120 ? "MEDIUM" : "OK" }
];

export const productionByDay = legacyProductivitySummary.daily.slice(0, 7).map((row) => ({
  day: dayLabels[new Date(`${row.date}T00:00:00`).getDay()] ?? row.date.slice(5),
  p1: row.producedKg,
  p2: 0,
  losses: legacyData.dashboard.lossesKg / Math.max(legacyProductivitySummary.daily.length, 1),
  overweight: legacyData.dashboard.overweightKg / Math.max(legacyProductivitySummary.daily.length, 1),
  yield: row.averageYield
}));

const downtimeTotals = legacyDowntimeEntries.reduce<Record<string, number>>((acc, entry) => {
  const reason = entry.reason?.name ?? "Sem motivo";
  acc[reason] = (acc[reason] ?? 0) + Number(entry.stoppedMinutes ?? 0);
  return acc;
}, {});

export const downtimeByReason = Object.entries(downtimeTotals)
  .map(([reason, minutes]) => ({ reason, minutes }))
  .sort((a, b) => b.minutes - a.minutes)
  .slice(0, 8);

export const topProducts = legacyOverweightRanking.slice(0, 8).map((row) => ({
  code: row.code,
  name: row.product,
  producedKg: row.producedKg,
  overweightKg: row.overweightKg
}));
