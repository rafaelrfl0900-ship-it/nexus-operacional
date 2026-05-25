"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { apiDeleteClient, apiGetClient, getSession } from "@/services/api";
import { formatKg } from "@/lib/format";
import { legacyProducts } from "@/lib/legacy-data";

interface ProductRow {
  id: string;
  code: string;
  name: string;
  active: boolean;
  defaultSector?: { code: "P1" | "P2" };
  weightConfig?: {
    boxWeightKg: string | number;
    packagesPerBox: number;
    massWeightKg: string | number;
    targetPackageWeightG: string | number;
  } | null;
}

const fallbackProducts = legacyProducts as ProductRow[];

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>(fallbackProducts);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(`${fallbackProducts.length} produto(s) carregado(s) da planilha local.`);
  const [loading, setLoading] = useState(false);
  const token = useMemo(() => getSession()?.accessToken, []);

  async function loadProducts(nextSearch = search) {
    if (!token) return;
    setLoading(true);
    try {
      const query = nextSearch ? `?search=${encodeURIComponent(nextSearch)}` : "";
      const data = await apiGetClient<ProductRow[]>(`/products${query}`, token);
      setProducts(data);
      setMessage(`${data.length} produto(s) carregado(s) da API.`);
    } catch (error) {
      setProducts(fallbackProducts);
      setMessage(error instanceof Error ? `${error.message} Catalogo da planilha local em uso.` : "Catalogo da planilha local em uso.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts("");
  }, []);

  async function deactivate(id: string) {
    if (!token || id.startsWith("legacy-")) {
      setMessage("Entre no sistema e carregue produtos reais para inativar.");
      return;
    }
    await apiDeleteClient(`/products/${id}`, token);
    await loadProducts();
  }

  const activeCount = products.filter((product) => product.active).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Banco de produtos" description="Cadastro unico de produto, pesos tecnicos, pacotes por caixa e tolerancia de sobrepeso." />

      <div className="flex flex-wrap gap-3">
        <input className="min-w-72 rounded-md border border-[var(--line)] bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-300/60" placeholder="Buscar codigo ou produto" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" onClick={() => loadProducts()} disabled={loading}>
          <RefreshCw className="size-4" />
          {loading ? "Carregando..." : "Buscar"}
        </Button>
      </div>

      <Card>
        <p className="text-sm text-slate-300">{message}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Produtos listados" value={String(products.length)} status="OK" />
        <StatCard label="Ativos" value={String(activeCount)} status="OK" />
        <StatCard label="Inativos" value={String(products.length - activeCount)} status={products.length - activeCount > 0 ? "ATTENTION" : "OK"} />
      </div>

      <DataTable
        title="Produtos"
        rows={products.map((product) => ({
          Codigo: product.code,
          Produto: product.name,
          Setor: product.defaultSector?.code ?? "-",
          Caixa: product.weightConfig ? formatKg(Number(product.weightConfig.boxWeightKg)) : "-",
          Pacotes: product.weightConfig?.packagesPerBox ?? "-",
          Alvo: product.weightConfig ? `${Number(product.weightConfig.targetPackageWeightG).toLocaleString("pt-BR")} g` : "-",
          Status: product.active ? "Ativo" : "Inativo",
          Acao: (
            <Button type="button" className="border-rose-300/30 bg-rose-300/10 text-rose-100" onClick={() => deactivate(product.id)}>
              <Trash2 className="size-4" />
              Inativar
            </Button>
          )
        }))}
      />
    </div>
  );
}
