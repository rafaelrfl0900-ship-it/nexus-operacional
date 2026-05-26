import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../../infrastructure/security/current-user";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  async create(payload: unknown, user?: CurrentUser) {
    const input = weekSchema.parse(payload);
    if (input.endsOn < input.startsOn) {
      throw new BadRequestException("Data final da semana nao pode ser menor que a inicial.");
    }
    const existing = await this.prisma.weeklyPeriod.findUnique({
      where: { year_month_weekNumber: { year: input.year, month: input.month, weekNumber: input.weekNumber } }
    });
    const overlapping = await this.prisma.weeklyPeriod.findFirst({
      where: {
        deletedAt: null,
        id: existing ? { not: existing.id } : undefined,
        startsOn: { lte: input.endsOn },
        endsOn: { gte: input.startsOn }
      }
    });
    if (overlapping) {
      throw new BadRequestException("Periodo semanal sobrepoe outra semana operacional.");
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
    await this.audit.record({ userId: this.safeUserId(user), module: "weeks", action: existing ? "update" : "create", entity: "WeeklyPeriod", entityId: week.id, before: existing, after: week });
    return week;
  }

  async close(id: string, user?: CurrentUser) {
    const current = await this.prisma.weeklyPeriod.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Semana nao encontrada.");
    const week = await this.prisma.weeklyPeriod.update({
      where: { id },
      data: { status: "CLOSED", closedAt: new Date() }
    });
    await this.audit.record({ userId: this.safeUserId(user), module: "weeks", action: "close", entity: "WeeklyPeriod", entityId: id, before: current, after: week });
    return week;
  }

  async reopen(id: string, reason?: string, user?: CurrentUser) {
    if (!reason?.trim()) {
      throw new BadRequestException("Reabertura de semana exige justificativa.");
    }
    const week = await this.prisma.weeklyPeriod.findUnique({ where: { id } });
    if (!week) throw new NotFoundException("Semana nao encontrada.");
    const reopened = await this.prisma.weeklyPeriod.update({
      where: { id },
      data: { status: "OPEN", closedAt: null }
    });
    await this.audit.record({ userId: this.safeUserId(user), module: "weeks", action: "reopen", entity: "WeeklyPeriod", entityId: id, before: week, after: reopened, reason });
    return reopened;
  }

  async archive(id: string, user?: CurrentUser) {
    const current = await this.prisma.weeklyPeriod.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Semana nao encontrada.");
    const archived = await this.prisma.weeklyPeriod.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() }
    });
    await this.audit.record({ userId: this.safeUserId(user), module: "weeks", action: "archive", entity: "WeeklyPeriod", entityId: id, before: current, after: archived });
    return archived;
  }

  async byId(id: string) {
    const week = await this.prisma.weeklyPeriod.findUnique({ where: { id } });
    if (!week) throw new NotFoundException("Semana nao encontrada.");
    return week;
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }
}
