"use client";

import { Maximize2, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { kpis, downtimeByReason } from "@/lib/demo-data";
import { formatKg, formatPercent } from "@/lib/format";
import { apiGetClient, getSession } from "@/services/api";

interface ExecutiveDeck {
  generatedAt: string;
  slides: Array<{ title: string; kind: string; data: unknown }>;
}

interface KpiPayload {
  productionTotalKg: number;
  lossesTotalKg: number;
  overweightTotalKg: number;
  overweightPercent: number;
  averageYield: number;
  stoppedMinutes: number;
  records: number;
}

interface DowntimePayload {
  reason: string;
  stoppedMinutes: number;
}

function asKpis(data: unknown): KpiPayload | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Partial<KpiPayload>;
  return {
    productionTotalKg: Number(record.productionTotalKg ?? 0),
    lossesTotalKg: Number(record.lossesTotalKg ?? 0),
    overweightTotalKg: Number(record.overweightTotalKg ?? 0),
    overweightPercent: Number(record.overweightPercent ?? 0),
    averageYield: Number(record.averageYield ?? 0),
    stoppedMinutes: Number(record.stoppedMinutes ?? 0),
    records: Number(record.records ?? 0)
  };
}

function asDowntime(data: unknown): DowntimePayload[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    const row = item as Partial<DowntimePayload>;
    return { reason: String(row.reason ?? "Sem motivo"), stoppedMinutes: Number(row.stoppedMinutes ?? 0) };
  });
}

export function MeetingMode() {
  const [deck, setDeck] = useState<ExecutiveDeck | null>(null);
  const [message, setMessage] = useState("Preview executivo local ativo.");

  async function loadDeck() {
    const token = getSession()?.accessToken;
    if (!token) {
      setDeck(null);
      setMessage("Entre no sistema para gerar apresentacao executiva com dados reais.");
      return;
    }

    try {
      const data = await apiGetClient<ExecutiveDeck>("/presentations/executive", token);
      setDeck(data);
      setMessage(`Apresentacao gerada em ${new Date(data.generatedAt).toLocaleString("pt-BR")}.`);
    } catch (error) {
      setDeck(null);
      setMessage(error instanceof Error ? error.message : "Nao foi possivel gerar a apresentacao.");
    }
  }

  useEffect(() => {
    loadDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executiveKpis = useMemo(() => {
    const slide = deck?.slides.find((item) => item.kind === "kpis");
    return asKpis(slide?.data);
  }, [deck]);

  const downtime = useMemo(() => {
    const slide = deck?.slides.find((item) => item.kind === "downtime");
    const rows = asDowntime(slide?.data);
    return rows.length ? rows : downtimeByReason.map((item) => ({ reason: item.reason, stoppedMinutes: item.minutes }));
  }, [deck]);

  const stats = executiveKpis
    ? [
        { label: "Producao total", value: formatKg(executiveKpis.productionTotalKg), status: "OK" as const },
        { label: "Perdas totais", value: formatKg(executiveKpis.lossesTotalKg), status: executiveKpis.lossesTotalKg > 80 ? "ATTENTION" as const : "OK" as const },
        { label: "Rendimento medio", value: formatPercent(executiveKpis.averageYield), status: executiveKpis.averageYield < 0.9 ? "ATTENTION" as const : "OK" as const }
      ]
    : kpis.slice(0, 3).map((kpi) => ({
        label: kpi.label,
        value: kpi.suffix === "kg" ? formatKg(kpi.value) : formatPercent(kpi.value),
        status: kpi.status
      }));

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-cyan-200/20 bg-[#08111f]/90 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase text-cyan-200">Modo reuniao</p>
            <h2 className="mt-2 text-4xl font-semibold">Resumo executivo semanal</h2>
            <p className="mt-3 max-w-3xl text-slate-300">Producao, perdas, sobrepeso, paradas, eficiencia e plano de acao em uma narrativa unica para tomada de decisao.</p>
          </div>
          <div className="flex gap-2">
            <Button className="border-white/15 bg-white/10 text-white hover:bg-white/15" onClick={loadDeck}>
              <RefreshCcw className="size-4" />
              Gerar
            </Button>
            <Button onClick={() => document.documentElement.requestFullscreen?.()}>
              <Maximize2 className="size-4" />
              Tela cheia
            </Button>
          </div>
        </div>
        <p className="mt-5 text-sm text-slate-400">{message}</p>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} status={kpi.status} />
        ))}
      </div>
      <Card>
        <h3 className="mb-4 text-lg font-semibold">Pontos criticos</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {downtime.slice(0, 3).map((item) => (
            <div key={item.reason} className="rounded-md border border-[var(--line)] bg-white/5 p-4">
              <p className="text-sm text-slate-400">{item.reason}</p>
              <strong className="mt-2 block text-2xl">{item.stoppedMinutes} min</strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
