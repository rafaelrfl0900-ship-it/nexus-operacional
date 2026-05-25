"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { apiGetClient, apiPostClient, getSession } from "@/services/api";

interface GoalRow {
  id: string;
  name: string;
  metric: string;
  sectorCode?: "P1" | "P2" | null;
  targetValue: string | number;
  comparator: string;
  active: boolean;
  updatedAt?: string;
}

const fallbackGoals: GoalRow[] = [
  { id: "goal-overweight", name: "Sobrepeso maximo", metric: "overweight", sectorCode: "P1", targetValue: 0.02, comparator: "<=", active: true },
  { id: "goal-yield", name: "Rendimento minimo", metric: "yield", sectorCode: null, targetValue: 0.95, comparator: ">=", active: true },
  { id: "goal-losses", name: "Perdas semanais", metric: "losses_kg", sectorCode: "P1", targetValue: 50, comparator: "<=", active: true }
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>(fallbackGoals);
  const [name, setName] = useState("Meta operacional");
  const [metric, setMetric] = useState("yield");
  const [sectorCode, setSectorCode] = useState("");
  const [targetValue, setTargetValue] = useState(0.95);
  const [comparator, setComparator] = useState(">=");
  const [message, setMessage] = useState("Aguardando login para carregar metas reais.");
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => getSession()?.accessToken, []);

  async function loadGoals() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiGetClient<GoalRow[]>("/goals", token);
      setGoals(data.length ? data : fallbackGoals);
      setMessage(data.length ? `${data.length} meta(s) carregada(s) da API.` : "Nenhuma meta cadastrada; exibindo amostra operacional.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Metas demonstrativas em uso.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  async function saveGoal() {
    if (!token) {
      setMessage("Entre no sistema com perfil gestor ou administrador para salvar metas.");
      return;
    }
    setLoading(true);
    try {
      await apiPostClient("/goals", { name, metric, sectorCode: sectorCode || undefined, targetValue, comparator, active: true }, token);
      await loadGoals();
      setMessage("Meta salva e disponivel para acompanhamento.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar meta.");
    } finally {
      setLoading(false);
    }
  }

  const activeGoals = goals.filter((goal) => goal.active).length;
  const sectorGoals = goals.filter((goal) => goal.sectorCode).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Metas e limites" description="Parametros configuraveis para perdas, sobrepeso, rendimento, producao e paradas." />

      <Card>
        <div className="grid gap-4 md:grid-cols-5">
          <Input label="Nome" value={name} onChange={setName} />
          <Select label="Metrica" value={metric} onChange={setMetric} options={[{ value: "yield", label: "Rendimento" }, { value: "overweight", label: "Sobrepeso" }, { value: "losses_kg", label: "Perdas kg" }, { value: "downtime_minutes", label: "Paradas min" }, { value: "produced_kg", label: "Producao kg" }]} />
          <Select label="Setor" value={sectorCode} onChange={setSectorCode} options={[{ value: "", label: "Global" }, { value: "P1", label: "P1" }, { value: "P2", label: "P2" }]} />
          <Select label="Comparador" value={comparator} onChange={setComparator} options={[{ value: "<=", label: "<=" }, { value: ">=", label: ">=" }, { value: "<", label: "<" }, { value: ">", label: ">" }, { value: "=", label: "=" }]} />
          <NumberInput label="Valor alvo" value={targetValue} onChange={setTargetValue} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={saveGoal} disabled={loading}>
            <Save className="size-4" />
            Salvar meta
          </Button>
          <Button type="button" className="border-slate-400/30 bg-white/5" onClick={loadGoals} disabled={loading}>
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-300">{message}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Metas ativas" value={String(activeGoals)} status="OK" />
        <StatCard label="Metas por setor" value={String(sectorGoals)} />
        <StatCard label="Metas globais" value={String(goals.length - sectorGoals)} />
      </div>

      <DataTable
        title="Metas"
        rows={goals.map((goal) => ({
          Meta: goal.name,
          Metrica: goal.metric,
          Setor: goal.sectorCode ?? "Global",
          Comparador: goal.comparator,
          Valor: Number(goal.targetValue).toLocaleString("pt-BR", { maximumFractionDigits: 4 }),
          Status: goal.active ? "Ativa" : "Inativa"
        }))}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <select className="w-full rounded-md border border-[var(--line)] bg-[#07101d] px-3 py-2 text-sm outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <input className="w-full rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <input type="number" step="0.001" className="w-full rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
