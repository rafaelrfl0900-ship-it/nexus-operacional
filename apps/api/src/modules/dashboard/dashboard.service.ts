import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { legacyWorkbookInsights } from "../../domain/legacy-insights";

function n(value: unknown): number {
  return Number(value ?? 0);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async kpis(weekId?: string) {
    const production = await this.prisma.productionEntry.aggregate({
      where: { deletedAt: null, weekId },
      _sum: {
        producedKg: true,
        weighingLossKg: true,
        overweightTotalKg: true
      },
      _avg: {
        realYieldPercent: true,
        overweightPercent: true
      },
      _count: true
    });
    const downtime = await this.prisma.downtimeEntry.aggregate({
      where: { deletedAt: null, weekId },
      _sum: { stoppedMinutes: true },
      _avg: { stoppedPercent: true }
    });
    const weeks = await this.prisma.weeklyPeriod.groupBy({ by: ["status"], _count: true });

    return {
      productionTotalKg: n(production._sum.producedKg),
      lossesTotalKg: n(production._sum.weighingLossKg),
      overweightTotalKg: n(production._sum.overweightTotalKg),
      overweightPercent: n(production._avg.overweightPercent),
      averageYield: n(production._avg.realYieldPercent),
      stoppedMinutes: n(downtime._sum.stoppedMinutes),
      stoppedPercent: n(downtime._avg.stoppedPercent),
      records: production._count,
      weeksByStatus: weeks.map((item) => ({ status: item.status, count: item._count })),
      legacyWorkbookInsights
    };
  }

  async charts(weekId?: string) {
    const bySector = await this.prisma.productionEntry.groupBy({
      by: ["sectorId"],
      where: { deletedAt: null, weekId },
      _sum: { producedKg: true, weighingLossKg: true, overweightTotalKg: true }
    });
    const sectors = await this.prisma.sector.findMany();
    const downtime = await this.prisma.downtimeEntry.groupBy({
      by: ["downtimeReasonId"],
      where: { deletedAt: null, weekId },
      _sum: { stoppedMinutes: true }
    });
    const reasons = await this.prisma.downtimeReason.findMany();

    return {
      productionBySector: bySector.map((row) => ({
        sector: sectors.find((sector) => sector.id === row.sectorId)?.code ?? row.sectorId,
        producedKg: n(row._sum.producedKg),
        lossesKg: n(row._sum.weighingLossKg),
        overweightKg: n(row._sum.overweightTotalKg)
      })),
      downtimeByReason: downtime.map((row) => ({
        reason: reasons.find((reason) => reason.id === row.downtimeReasonId)?.name ?? row.downtimeReasonId,
        stoppedMinutes: n(row._sum.stoppedMinutes)
      }))
    };
  }

  health() {
    return {
      status: "ok",
      service: "nexus-operacional-api",
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      timestamp: new Date().toISOString()
    };
  }

  async dbHealth() {
    if (!process.env.DATABASE_URL) {
      return {
        status: "missing-database-url",
        database: "not_configured",
        timestamp: new Date().toISOString()
      };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: "reachable",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: "database-unreachable",
        database: "error",
        message: error instanceof Error ? error.message : "Unknown database error",
        timestamp: new Date().toISOString()
      };
    }
  }
}
