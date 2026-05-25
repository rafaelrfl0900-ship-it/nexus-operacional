export const kpis = [
  { label: "Producao total", value: 50910.4, suffix: "kg", status: "OK" },
  { label: "Perdas totais", value: 74.31, suffix: "kg", status: "ATTENTION" },
  { label: "Sobrepeso total", value: 441.68, suffix: "kg", status: "ATTENTION" },
  { label: "Sobrepeso medio", value: 0.0087, suffix: "%", status: "OK" },
  { label: "Rendimento medio", value: 0.9866, suffix: "%", status: "OK" },
  { label: "Tempo parado", value: 941.16, suffix: "min", status: "MEDIUM" }
];

export const productionByDay = [
  { day: "Seg", p1: 12330, p2: 120, losses: 20.98, overweight: 109.44, yield: 1.038 },
  { day: "Ter", p1: 9048, p2: 92, losses: 0, overweight: 96.8, yield: 1.01 },
  { day: "Qua", p1: 8486, p2: 0, losses: 0, overweight: 204.4, yield: 0.98 },
  { day: "Qui", p1: 10020, p2: 110, losses: 18.3, overweight: 52.2, yield: 0.96 },
  { day: "Sex", p1: 10594, p2: 110, losses: 35.03, overweight: 79.0, yield: 0.95 }
];

export const downtimeByReason = [
  { reason: "Troca de arame", minutes: 180 },
  { reason: "Aguardando embalagem", minutes: 165 },
  { reason: "Aguardando massa", minutes: 140 },
  { reason: "Aguardando congelar", minutes: 92 },
  { reason: "Limpeza", minutes: 70 }
];

export const topProducts = [
  { code: "72169", name: "PQ Rei do Mate 13g x 1kg", producedKg: 15816, overweightKg: 142.34 },
  { code: "72170", name: "PQ Rei do Mate 60g x 1kg", producedKg: 2496, overweightKg: 0 },
  { code: "69903", name: "Palito Gratinado 60g", producedKg: 1878, overweightKg: 0 },
  { code: "76678", name: "Produto congelado especial", producedKg: 15218, overweightKg: 85.82 }
];
