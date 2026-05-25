import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";

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
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.goal.findMany({ where: { deletedAt: null }, orderBy: { metric: "asc" } });
  }

  create(payload: unknown) {
    return this.prisma.goal.create({ data: goalSchema.parse(payload) });
  }
}
