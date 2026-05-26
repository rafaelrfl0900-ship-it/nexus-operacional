import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { AuditService } from "../audit/audit.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async weeklyProduction(weekId?: string, user?: CurrentUser) {
    const entries = await this.prisma.productionEntry.findMany({
      where: { deletedAt: null, weekId },
      include: { product: true, sector: true, week: true },
      orderBy: [{ date: "asc" }, { sector: { code: "asc" } }]
    });
    const csv = [
      "data,setor,produto,op,produzido_kg,perdas_kg,sobrepeso_kg,rendimento",
      ...entries.map((entry) =>
        [
          entry.date.toISOString().slice(0, 10),
          entry.sector.code,
          entry.product.code,
          entry.productionOrder,
          entry.producedKg,
          entry.weighingLossKg,
          entry.overweightTotalKg,
          entry.realYieldPercent
        ].join(",")
      )
    ].join("\n");

    const exportRow = await this.prisma.reportExport.create({
      data: { type: "weekly-production-csv", filters: { weekId }, status: "GENERATED", createdBy: this.safeUserId(user) }
    });
    await this.audit.record({
      userId: this.safeUserId(user),
      module: "reports",
      action: "export",
      entity: "ReportExport",
      entityId: exportRow.id,
      after: { type: exportRow.type, filters: exportRow.filters, status: exportRow.status }
    });
    return { exportId: exportRow.id, format: "csv", csv };
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }
}
