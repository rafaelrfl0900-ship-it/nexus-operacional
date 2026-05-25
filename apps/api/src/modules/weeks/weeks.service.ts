import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AuditService } from "../audit/audit.service";

const weekSchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  weekNumber: z.coerce.number().int().min(1).max(6),
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date()
});

@Injectable()
export class WeeksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list() {
    return this.prisma.weeklyPeriod.findMany({ where: { deletedAt: null }, orderBy: [{ year: "desc" }, { month: "desc" }, { weekNumber: "desc" }] });
  }

  async create(payload: unknown) {
    const input = weekSchema.parse(payload);
    if (input.endsOn < input.startsOn) {
      throw new BadRequestException("Data final da semana nao pode ser menor que a inicial.");
    }
    const week = await this.prisma.weeklyPeriod.upsert({
      where: { year_month_weekNumber: { year: input.year, month: input.month, weekNumber: input.weekNumber } },
      create: {
        year: input.year,
        month: input.month,
        weekNumber: input.weekNumber,
        label: `Semana ${input.weekNumber}`,
        startsOn: input.startsOn,
        endsOn: input.endsOn
      },
      update: {
        startsOn: input.startsOn,
        endsOn: input.endsOn
      }
    });
    await this.audit.record({ module: "weeks", action: "create_or_update", entity: "WeeklyPeriod", entityId: week.id, after: week });
    return week;
  }

  async close(id: string) {
    const week = await this.prisma.weeklyPeriod.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() }
    });
    await this.audit.record({ module: "weeks", action: "close", entity: "WeeklyPeriod", entityId: id, after: week });
    return week;
  }

  async reopen(id: string, reason?: string) {
    const week = await this.prisma.weeklyPeriod.findUnique({ where: { id } });
    if (!week) throw new NotFoundException("Semana nao encontrada.");
    const reopened = await this.prisma.weeklyPeriod.update({
      where: { id },
      data: { status: "OPEN", closedAt: null }
    });
    await this.audit.record({ module: "weeks", action: "reopen", entity: "WeeklyPeriod", entityId: id, before: week, after: reopened, reason });
    return reopened;
  }

  async archive(id: string) {
    return this.prisma.weeklyPeriod.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() }
    });
  }

  async byId(id: string) {
    const week = await this.prisma.weeklyPeriod.findUnique({ where: { id } });
    if (!week) throw new NotFoundException("Semana nao encontrada.");
    return week;
  }
}
