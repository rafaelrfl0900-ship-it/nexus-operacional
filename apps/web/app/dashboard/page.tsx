import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { PageHeader } from "@/components/layout/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard geral" description="KPIs executivos, comparativo P1 x P2, perdas, sobrepeso, paradas e tendencia semanal." />
      <ExecutiveDashboard />
    </div>
  );
}
