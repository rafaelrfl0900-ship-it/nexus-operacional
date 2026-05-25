import { ProductionForm } from "@/components/forms/production-form";
import { PageHeader } from "@/components/layout/page-header";

export default function ProductionP1Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Producao P1" description="Lancamento rapido de bateladas, caixas, pesagem, reformas, rendimento e sobrepeso do setor P1." />
      <ProductionForm sector="P1" />
    </div>
  );
}
