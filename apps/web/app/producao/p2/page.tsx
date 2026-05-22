import { ProductionForm } from "@/components/forms/production-form";
import { PageHeader } from "@/components/layout/page-header";

export default function ProductionP2Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="Producao P2" description="Lancamento diario do setor P2 com calculos tecnicos protegidos e consolidacao no dashboard geral." />
      <ProductionForm sector="P2" />
    </div>
  );
}
