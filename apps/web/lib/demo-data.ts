const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const kpis = demoMode
  ? [
      { label: "Producao total", value: 18420, suffix: "kg", status: "OK" },
      { label: "Perdas totais", value: 42, suffix: "kg", status: "OK" },
      { label: "Sobrepeso total", value: 28, suffix: "kg", status: "OK" },
      { label: "Sobrepeso medio", value: 0.012, suffix: "%", status: "OK" },
      { label: "Rendimento medio", value: 0.972, suffix: "%", status: "OK" },
      { label: "Tempo parado", value: 64, suffix: "min", status: "MEDIUM" }
    ]
  : [
      { label: "Producao total", value: 0, suffix: "kg", status: "OK" },
      { label: "Perdas totais", value: 0, suffix: "kg", status: "OK" },
      { label: "Sobrepeso total", value: 0, suffix: "kg", status: "OK" },
      { label: "Sobrepeso medio", value: 0, suffix: "%", status: "OK" },
      { label: "Rendimento medio", value: 0, suffix: "%", status: "OK" },
      { label: "Tempo parado", value: 0, suffix: "min", status: "OK" }
    ];

export const productionByDay = demoMode
  ? [
      { day: "Seg", p1: 4200, p2: 1200, losses: 8, overweight: 5, yield: 0.97 },
      { day: "Ter", p1: 3900, p2: 1400, losses: 7, overweight: 6, yield: 0.98 },
      { day: "Qua", p1: 4100, p2: 1300, losses: 9, overweight: 7, yield: 0.96 }
    ]
  : [];

export const downtimeByReason = demoMode
  ? [
      { reason: "Aguardando massa", minutes: 28 },
      { reason: "Setup", minutes: 21 },
      { reason: "Limpeza", minutes: 15 }
    ]
  : [];

export const topProducts = demoMode
  ? [
      { code: "DEMO-001", name: "Produto demonstrativo A", producedKg: 6400, overweightKg: 11 },
      { code: "DEMO-002", name: "Produto demonstrativo B", producedKg: 5100, overweightKg: 9 }
    ]
  : [];
