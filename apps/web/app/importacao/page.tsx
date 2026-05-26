"use client";

import { useEffect, useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { apiGetClient, apiPostClient, getSession } from "@/services/api";

interface ImportPreview {
  source: string;
  sheetCount: number;
  formulaCount: number;
  errors: Record<string, number>;
  legacyData?: {
    productCount?: number;
    duplicateWeightCodes?: string[];
    importErrorCount?: number;
  };
}

interface ImportBatch {
  id: string;
  status: string;
  summary?: {
    importedProducts?: number;
    duplicateWeightCodes?: string[];
    importErrorCount?: number;
  };
  errors?: Array<{ sheetName?: string | null; cell?: string | null; message: string }>;
}

const fallbackPreview: ImportPreview = {
  source: "API nao carregada",
  sheetCount: 0,
  formulaCount: 0,
  errors: {},
  legacyData: {
    productCount: 0,
    duplicateWeightCodes: [],
    importErrorCount: 0
  }
};

export default function ImportPage() {
  const [preview, setPreview] = useState<ImportPreview>(fallbackPreview);
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("Aguardando conexao autenticada com a API.");
  const token = useMemo(() => getSession()?.accessToken, []);

  useEffect(() => {
    if (!token) return;
    apiGetClient<ImportPreview>("/import/preview", token)
      .then((data) => {
        setPreview(data);
        setMessage("Preview carregado da API.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Nao foi possivel carregar preview da API."));
  }, [token]);

  async function runImport() {
    if (!token) {
      setMessage("Entre no sistema para executar a importacao real.");
      return;
    }

    setLoading(true);
    setMessage("Importando produtos e configuracoes tecnicas...");
    try {
      const result = await apiPostClient<ImportBatch>("/import/products", {}, token);
      setBatch(result);
      setMessage("Importacao concluida e registrada no banco.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao importar produtos.");
    } finally {
      setLoading(false);
    }
  }

  const totalCachedErrors = Object.values(preview.errors ?? {}).reduce((sum, value) => sum + value, 0);
  const errorRows = batch?.errors?.length
    ? batch.errors.map((error) => ({
        Aba: error.sheetName ?? "-",
        Celula: error.cell ?? "-",
        Erro: error.message
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Importacao da planilha" description="Leitura segura, normalizacao de produtos e registro auditavel de inconsistencias." />

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={runImport} disabled={loading}>
          <UploadCloud className="size-4" />
          {loading ? "Importando..." : "Importar produtos"}
        </Button>
        <Button type="button" className="border-slate-400/30 bg-white/5" onClick={() => window.location.reload()}>
          Atualizar preview
        </Button>
      </div>

      <Card>
        <p className="text-sm text-slate-300">{message}</p>
        <p className="mt-2 text-xs text-slate-500">Fonte: {preview.source}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Abas detectadas" value={String(preview.sheetCount)} status="OK" />
        <StatCard label="Formulas legado" value={preview.formulaCount.toLocaleString("pt-BR")} />
        <StatCard label="Produtos normalizados" value={String(batch?.summary?.importedProducts ?? preview.legacyData?.productCount ?? 0)} status="OK" />
        <StatCard label="Inconsistencias" value={String(batch?.summary?.importErrorCount ?? preview.legacyData?.importErrorCount ?? totalCachedErrors)} status="ATTENTION" />
      </div>

      <DataTable title="Erros e pontos de auditoria da importacao" rows={errorRows} />
    </div>
  );
}
