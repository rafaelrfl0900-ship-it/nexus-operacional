import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { lossEntrySchema } from "../../domain/validators/schemas";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../../infrastructure/security/current-user";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dateOnly(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

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

  async create(payload: unknown, user?: CurrentUser) {
    const input = lossEntrySchema.parse(payload);
    const week = await this.prisma.weeklyPeriod.findUnique({ where: { id: input.weekId } });
    if (!week) throw new NotFoundException("Semana nao encontrada.");
    if (week.status !== "OPEN" && week.status !== "REVIEW") {
      throw new BadRequestException("Semana fechada ou arquivada nao aceita perdas.");
    }
    this.assertDateInsideWeek(input.date, week.startsOn, week.endsOn);
    const userId = this.safeUserId(user);

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
        notes: input.notes,
        createdBy: userId,
        updatedBy: userId
      },
      include: { lossType: true, product: true, sector: true }
    });
    await this.audit.record({ userId, module: "losses", action: "create", entity: "LossEntry", entityId: loss.id, after: loss });
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

  private assertDateInsideWeek(date: Date, startsOn: Date, endsOn: Date) {
    const target = dateOnly(date);
    if (target < dateOnly(startsOn) || target > dateOnly(endsOn)) {
      throw new BadRequestException("Data da perda precisa pertencer ao periodo da semana selecionada.");
    }
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }
}
