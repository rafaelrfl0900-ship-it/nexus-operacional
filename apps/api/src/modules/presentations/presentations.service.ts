import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { DashboardService } from "../dashboard/dashboard.service";

@Injectable()
export class PresentationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService
  ) {}

  async executiveDeck(weekId?: string) {
    const kpis = await this.dashboard.kpis(weekId);
    const charts = await this.dashboard.charts(weekId);
    const payload = {
      generatedAt: new Date().toISOString(),
      slides: [
        { title: "Capa", kind: "cover", data: { weekId } },
        { title: "Resumo executivo", kind: "kpis", data: kpis },
        { title: "Producao", kind: "production", data: charts.productionBySector },
        { title: "Perdas e sobrepeso", kind: "losses", data: charts.productionBySector },
        { title: "Paradas", kind: "downtime", data: charts.downtimeByReason },
        { title: "Plano de acao", kind: "action-plan", data: [] }
      ]
    };
    await this.prisma.presentationExport.create({
      data: { type: "executive-deck", filters: { weekId }, payload, status: "GENERATED" }
    });
    return payload;
  }
}
