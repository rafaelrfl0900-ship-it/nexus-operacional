"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { formatKg } from "@/lib/format";
import { apiGetClient, apiPostClient, getSession } from "@/services/api";

interface WeekRow {
  id: string;
  label: string;
  status: string;
}

interface LossTypeRow {
  id: string;
  name: string;
}

interface LossEntryRow {
  id: string;
  date: string;
  quantityKg: string | number;
  reason?: string | null;
  sector?: { code: string } | null;
  lossType?: { name: string };
}

export default function LossesPage() {
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [types, setTypes] = useState<LossTypeRow[]>([]);
  const [entries, setEntries] = useState<LossEntryRow[]>([]);
  const [weekId, setWeekId] = useState("");
  const [lossTypeId, setLossTypeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sector, setSector] = useState<"P1" | "P2">("P1");
  const [quantityKg, setQuantityKg] = useState(10);
  const [reason, setReason] = useState("Lancamento operacional");
  const [message, setMessage] = useState("Carregando perdas da API.");
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => getSession()?.accessToken, []);

  async function loadData(nextWeekId = weekId) {
    const requestedWeek = nextWeekId || weekId;
    if (!token) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const [weekRows, typeRows] = await Promise.all([
        apiGetClient<WeekRow[]>("/weeks", token),
        apiGetClient<LossTypeRow[]>("/losses/types", token)
      ]);
      const selectedWeek = requestedWeek || weekRows.find((week) => week.status !== "CLOSED" && week.status !== "ARCHIVED")?.id || weekRows[0]?.id || "";
      setWeeks(weekRows);
      setTypes(typeRows);
      setWeekId(selectedWeek);
      setLossTypeId((current) => current || typeRows[0]?.id || "");
      if (selectedWeek) {
        const lossRows = await apiGetClient<LossEntryRow[]>(`/losses?weekId=${selectedWeek}`, token);
        setEntries(lossRows);
      }
      setMessage("Perdas carregadas da API.");
    } catch (error) {
      setWeeks([]);
      setTypes([]);
      setEntries([]);
      setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar perdas da API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData("");
  }, []);

  async function saveLoss() {
    if (!token || !weekId || !lossTypeId) {
      setMessage("Entre no sistema e selecione semana/tipo para salvar.");
      return;
    }
    setLoading(true);
    try {
      await apiPostClient("/losses", { weekId, date, sector, lossTypeId, quantityKg, reason }, token);
      await loadData(weekId);
      setMessage("Perda registrada e auditada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar perda.");
    } finally {
      setLoading(false);
    }
  }

  const total = entries.reduce((sum, entry) => sum + Number(entry.quantityKg), 0);
  const rows = entries.length
    ? entries.map((entry) => ({
        Data: entry.date.slice(0, 10),
        Setor: entry.sector?.code ?? "-",
        Tipo: entry.lossType?.name ?? "-",
        Quantidade: formatKg(Number(entry.quantityKg)),
        Motivo: entry.reason ?? "-"
      }))
    : [{ Data: "-", Setor: "-", Tipo: "Nenhuma perda carregada.", Quantidade: "-", Motivo: "-" }];

  return (
    <div className="space-y-6">
      <PageHeader title="Controle de perdas" description="Registre perdas por embalagem, caixa, organico, maquina, pesagem, sobrepeso e outros." />
      <Card>
        <div className="grid gap-4 md:grid-cols-5">
          <Select label="Semana" value={weekId} onChange={setWeekId} options={weeks.map((week) => ({ value: week.id, label: `${week.label} - ${week.status}` }))} />
          <Select label="Tipo" value={lossTypeId} onChange={setLossTypeId} options={types.map((type) => ({ value: type.id, label: type.name }))} />
          <Select label="Setor" value={sector} onChange={(value) => setSector(value as "P1" | "P2")} options={[{ value: "P1", label: "P1" }, { value: "P2", label: "P2" }]} />
          <Input label="Data" type="date" value={date} onChange={setDate} />
          <NumberInput label="Kg" value={quantityKg} onChange={setQuantityKg} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Input label="Motivo" value={reason} onChange={setReason} />
          <Button type="button" onClick={saveLoss} disabled={loading}>
            <Save className="size-4" />
            Salvar perda
          </Button>
          <Button type="button" className="border-slate-400/30 bg-white/5" onClick={() => loadData(weekId)} disabled={loading}>
            <RefreshCw className="size-4" />
            Atualizar
          </Button>
        </div>
        <p className="mt-4 text-sm text-slate-300">{message}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Perdas da semana" value={formatKg(total)} status={total > 50 ? "ATTENTION" : "OK"} />
        <StatCard label="Registros" value={String(entries.length)} />
        <StatCard label="Meta semanal" value="< 50 kg" status={total > 50 ? "ATTENTION" : "OK"} />
      </div>
      <DataTable title="Perdas" rows={rows} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <select className="w-full rounded-md border border-[var(--line)] bg-[#07101d] px-3 py-2 text-sm outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="min-w-48 flex-1 space-y-2">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <input type={type} className="w-full rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <input type="number" className="w-full rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
