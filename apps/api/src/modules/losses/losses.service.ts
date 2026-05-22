import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { lossEntrySchema } from "../../domain/validators/schemas";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class LossesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(query: { weekId?: string; typeId?: string }) {
    return this.prisma.lossEntry.findMany({
      where: { deletedAt: null, weekId: query.weekId, lossTypeId: query.typeId },
      include: { lossType: true, product: true, sector: true, week: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    });
  }

  types() {
    return this.prisma.lossType.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  async create(payload: unknown) {
    const input = lossEntrySchema.parse(payload);
    const loss = await this.prisma.lossEntry.create({
      data: {
        weekId: input.weekId,
        date: input.date,
        sectorId: input.sector ? (await this.prisma.sector.findUniqueOrThrow({ where: { code: input.sector } })).id : undefined,
        productId: input.productId,
        productionOrderId: input.productionOrderId,
        lossTypeId: input.lossTypeId,
        quantityKg: input.quantityKg,
        reason: input.reason,
        notes: input.notes
      },
      include: { lossType: true, product: true, sector: true }
    });
    await this.audit.record({ module: "losses", action: "create", entity: "LossEntry", entityId: loss.id, after: loss });
    return loss;
  }

  async summary(weekId?: string) {
    const rows = await this.prisma.lossEntry.groupBy({
      by: ["lossTypeId"],
      where: { deletedAt: null, weekId },
      _sum: { quantityKg: true }
    });
    const types = await this.prisma.lossType.findMany();
    return rows.map((row) => {
      const type = types.find((item) => item.id === row.lossTypeId);
      return { type: type?.name ?? row.lossTypeId, quantityKg: Number(row._sum.quantityKg ?? 0) };
    });
  }
}
