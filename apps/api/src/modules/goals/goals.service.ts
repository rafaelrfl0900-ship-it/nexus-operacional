import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { AuditService } from "../audit/audit.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const goalSchema = z.object({
  name: z.string().min(2),
  metric: z.string().min(2),
  sectorCode: z.enum(["P1", "P2"]).optional(),
  targetValue: z.coerce.number(),
  comparator: z.enum(["<=", ">=", "<", ">", "="]).default("<="),
  active: z.boolean().default(true)
});

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list() {
    return this.prisma.goal.findMany({ where: { deletedAt: null }, orderBy: { metric: "asc" } });
  }

  async create(payload: unknown, user?: CurrentUser) {
    const goal = await this.prisma.goal.create({ data: goalSchema.parse(payload) });
    await this.audit.record({
      userId: this.safeUserId(user),
      module: "goals",
      action: "create",
      entity: "Goal",
      entityId: goal.id,
      after: goal
    });
    return goal;
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }
}
