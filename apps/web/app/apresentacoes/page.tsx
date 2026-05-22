import { MeetingMode } from "@/components/presentations/meeting-mode";
import { PageHeader } from "@/components/layout/page-header";

export default function PresentationsPage() {
  return (
    <div>
      <PageHeader title="Apresentacoes" description="Modo reuniao com narrativa executiva, indicadores centrais, graficos, alertas e plano de acao." />
      <MeetingMode />
    </div>
  );
}
