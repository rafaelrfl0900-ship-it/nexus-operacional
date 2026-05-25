import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async weeklyProduction(weekId?: string) {
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
      data: { type: "weekly-production-csv", filters: { weekId }, status: "GENERATED" }
    });
    return { exportId: exportRow.id, format: "csv", csv };
  }
}
