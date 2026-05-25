import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function NotFoundPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Pagina nao encontrada" description="O caminho solicitado nao corresponde a nenhum modulo operacional." />
      <Card>
        <Link className="inline-flex rounded-md border border-cyan-300/30 bg-cyan-300/[0.12] px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20" href="/">
          Voltar ao menu principal
        </Link>
      </Card>
    </div>
  );
}
