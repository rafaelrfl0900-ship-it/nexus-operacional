import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { downtimeEntrySchema } from "../../domain/validators/schemas";
import { calculateDowntime } from "../../domain/calculations/downtime-calculations";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class DowntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(query: { weekId?: string; reasonId?: string }) {
    return this.prisma.downtimeEntry.findMany({
      where: { deletedAt: null, weekId: query.weekId, downtimeReasonId: query.reasonId },
      include: { week: true, sector: true, line: true, reason: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    });
  }

  reasons() {
    return this.prisma.downtimeReason.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  async create(payload: unknown) {
    const input = downtimeEntrySchema.parse(payload);
    const sector = await this.prisma.sector.findUniqueOrThrow({ where: { code: input.sector } });
    const calculated = calculateDowntime({
      productionStart: input.productionStart,
      productionEnd: input.productionEnd,
      downtimeStart: input.downtimeStart,
      downtimeEnd: input.downtimeEnd,
      producedMassKg: input.producedMassKg
    });
    const entry = await this.prisma.downtimeEntry.create({
      data: {
        weekId: input.weekId,
        date: input.date,
        sectorId: sector.id,
        lineId: input.lineId,
        productionStart: input.productionStart,
        productionEnd: input.productionEnd,
        downtimeStart: input.downtimeStart,
        downtimeEnd: input.downtimeEnd,
        producedMassKg: input.producedMassKg,
        stoppedMinutes: calculated.stoppedMinutes,
        stoppedPercent: calculated.stoppedPercent,
        realKgHour: calculated.realKgHour,
        possibleKgHour: calculated.possibleKgHour,
        status: calculated.status,
        downtimeReasonId: input.downtimeReasonId,
        notes: [input.notes, ...calculated.inconsistencies].filter(Boolean).join("\n")
      },
      include: { sector: true, reason: true, week: true }
    });
    await this.audit.record({ module: "downtime", action: "create", entity: "DowntimeEntry", entityId: entry.id, after: entry });
    return { ...entry, calculations: calculated };
  }

  async summary(weekId?: string) {
    const rows = await this.prisma.downtimeEntry.groupBy({
      by: ["downtimeReasonId"],
      where: { deletedAt: null, weekId },
      _sum: { stoppedMinutes: true },
      _count: true
    });
    const reasons = await this.prisma.downtimeReason.findMany();
    return rows.map((row) => ({
      reason: reasons.find((reason) => reason.id === row.downtimeReasonId)?.name ?? row.downtimeReasonId,
      stoppedMinutes: Number(row._sum.stoppedMinutes ?? 0),
      count: row._count
    }));
  }
}
