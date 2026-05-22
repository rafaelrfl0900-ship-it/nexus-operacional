"use client";

import { useEffect, useState } from "react";
import { NexusChart } from "@/components/charts/nexus-chart";
import { StatCard } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { kpis, productionByDay, downtimeByReason, topProducts } from "@/lib/demo-data";
import { formatKg, formatPercent } from "@/lib/format";
import { apiGetClient, getSession } from "@/services/api";

interface DashboardKpis {
  productionTotalKg: number;
  lossesTotalKg: number;
  overweightTotalKg: number;
  overweightPercent: number;
  averageYield: number;
  stoppedMinutes: number;
  records: number;
}

interface DashboardCharts {
  productionBySector: Array<{ sector: string; producedKg: number; lossesKg: number; overweightKg: number }>;
  downtimeByReason: Array<{ reason: string; stoppedMinutes: number }>;
}

export function ExecutiveDashboard() {
  const [realKpis, setRealKpis] = useState<DashboardKpis | null>(null);
  const [realCharts, setRealCharts] = useState<DashboardCharts | null>(null);
  const [source, setSource] = useState("demo");

  useEffect(() => {
    const token = getSession()?.accessToken;
    if (!token) return;
    Promise.all([
      apiGetClient<DashboardKpis>("/dashboard/kpis", token),
      apiGetClient<DashboardCharts>("/dashboard/charts", token)
    ])
      .then(([kpiData, chartData]) => {
        setRealKpis(kpiData);
        setRealCharts(chartData);
        setSource("api");
      })
      .catch(() => setSource("demo"));
  }, []);

  const dashboardKpis = realKpis
    ? [
        { label: "Producao total", value: realKpis.productionTotalKg, suffix: "kg", status: "OK" },
        { label: "Perdas totais", value: realKpis.lossesTotalKg, suffix: "kg", status: realKpis.lossesTotalKg > 50 ? "ATTENTION" : "OK" },
        { label: "Sobrepeso total", value: realKpis.overweightTotalKg, suffix: "kg", status: realKpis.overweightPercent > 0.02 ? "ATTENTION" : "OK" },
        { label: "Sobrepeso medio", value: realKpis.overweightPercent, suffix: "%", status: realKpis.overweightPercent > 0.02 ? "ATTENTION" : "OK" },
        { label: "Rendimento medio", value: realKpis.averageYield, suffix: "%", status: realKpis.averageYield < 0.95 ? "ATTENTION" : "OK" },
        { label: "Tempo parado", value: realKpis.stoppedMinutes, suffix: "min", status: "MEDIUM" }
      ]
    : kpis;

  const sectorBars = realCharts?.productionBySector?.length
    ? realCharts.productionBySector
    : [
        { sector: "P1", producedKg: productionByDay.reduce((sum, item) => sum + item.p1, 0), lossesKg: 74.31, overweightKg: 441.68 },
        { sector: "P2", producedKg: productionByDay.reduce((sum, item) => sum + item.p2, 0), lossesKg: 0, overweightKg: 0 }
      ];
  const reasonBars = realCharts?.downtimeByReason?.length
    ? realCharts.downtimeByReason
    : downtimeByReason.map((item) => ({ reason: item.reason, stoppedMinutes: item.minutes }));

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm text-slate-300">
        Fonte do dashboard: {source === "api" ? "API conectada ao banco" : "dados demonstrativos ate login/API estar disponivel"}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardKpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.suffix === "kg" ? formatKg(kpi.value) : kpi.suffix === "%" ? formatPercent(kpi.value) : `${kpi.value.toFixed(0)} min`}
            status={kpi.status}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NexusChart
          title="Producao por setor e semana"
          option={{
            tooltip: { trigger: "axis" },
            legend: { textStyle: { color: "#cbd5e1" } },
            xAxis: { type: "category", data: sectorBars.map((item) => item.sector) },
            yAxis: { type: "value" },
            series: [
              { name: "Produzido", type: "bar", stack: "total", data: sectorBars.map((item) => item.producedKg), itemStyle: { color: "#22d3ee" } },
              { name: "Sobrepeso", type: "bar", stack: "total", data: sectorBars.map((item) => item.overweightKg), itemStyle: { color: "#f59e0b" } }
            ]
          }}
        />
        <NexusChart
          title="Rendimento e sobrepeso diario"
          option={{
            tooltip: { trigger: "axis" },
            legend: { textStyle: { color: "#cbd5e1" } },
            xAxis: { type: "category", data: productionByDay.map((item) => item.day) },
            yAxis: [{ type: "value" }],
            series: [
              { name: "Rendimento", type: "line", smooth: true, data: productionByDay.map((item) => item.yield), itemStyle: { color: "#34d399" } },
              { name: "Sobrepeso kg", type: "line", smooth: true, data: productionByDay.map((item) => item.overweight), itemStyle: { color: "#f59e0b" } }
            ]
          }}
        />
        <NexusChart
          title="Paradas por motivo"
          option={{
            tooltip: { trigger: "axis" },
            xAxis: { type: "value" },
            yAxis: { type: "category", data: reasonBars.map((item) => item.reason) },
            series: [{ name: "Minutos", type: "bar", data: reasonBars.map((item) => item.stoppedMinutes), itemStyle: { color: "#a78bfa" } }]
          }}
        />
        <NexusChart
          title="Perdas por tipo"
          option={{
            tooltip: { trigger: "item" },
            series: [
              {
                type: "pie",
                radius: ["48%", "72%"],
                data: [
                  { name: "Pesagem", value: 74.31 },
                  { name: "Sobrepeso", value: 441.68 },
                  { name: "Embalagem", value: 20 },
                  { name: "Caixa", value: 6 }
                ]
              }
            ]
          }}
        />
      </div>

      <DataTable
        title="Ranking operacional de produtos"
        rows={topProducts.map((item) => ({
          Codigo: item.code,
          Produto: item.name,
          Producao: formatKg(item.producedKg),
          Sobrepeso: formatKg(item.overweightKg),
          Status: item.overweightKg > 100 ? "ATTENTION" : "OK"
        }))}
      />
    </div>
  );
}
