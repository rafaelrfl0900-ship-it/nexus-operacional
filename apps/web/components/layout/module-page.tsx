import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { PageHeader } from "./page-header";

export function ModulePage({
  title,
  description,
  stats,
  rows
}: {
  title: string;
  description: string;
  stats: Array<{ label: string; value: string; status?: string }>;
  rows: Array<Record<string, React.ReactNode>>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="flex flex-wrap gap-3">
        <Button>Adicionar</Button>
        <Button className="border-slate-400/30 bg-white/5">Exportar</Button>
        <Button className="border-slate-400/30 bg-white/5">Filtrar</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      {rows.length > 0 ? (
        <DataTable title={title} rows={rows} />
      ) : (
        <Card>
          <p className="text-sm text-slate-400">Nenhum registro encontrado para o filtro atual.</p>
        </Card>
      )}
    </div>
  );
}
