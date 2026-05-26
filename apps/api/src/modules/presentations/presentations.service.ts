import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { AuditService } from "../audit/audit.service";
import { DashboardService } from "../dashboard/dashboard.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PresentationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly audit: AuditService
  ) {}

  async executiveDeck(weekId?: string, user?: CurrentUser) {
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
    const exportRow = await this.prisma.presentationExport.create({
      data: { type: "executive-deck", filters: { weekId }, payload, status: "GENERATED", createdBy: this.safeUserId(user) }
    });
    await this.audit.record({
      userId: this.safeUserId(user),
      module: "presentations",
      action: "export",
      entity: "PresentationExport",
      entityId: exportRow.id,
      after: { type: exportRow.type, filters: exportRow.filters, status: exportRow.status }
    });
    return payload;
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }
}
