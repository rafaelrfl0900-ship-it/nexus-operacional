import { ModulePage } from "@/components/layout/module-page";

export default function SettingsPage() {
  return (
    <ModulePage
      title="Configuracoes"
      description="Preferencias da empresa, temas, tolerancias globais, origem de importacao e parametros operacionais."
      stats={[
        { label: "Tema", value: "Escuro", status: "OK" },
        { label: "Empresa", value: "Configuravel" },
        { label: "API", value: "http://localhost:3333" }
      ]}
      rows={[
        { Chave: "company.name", Valor: "Empresa", Escopo: "global" },
        { Chave: "backup.retention_days", Valor: "30", Escopo: "infra" }
      ]}
    />
  );
}
