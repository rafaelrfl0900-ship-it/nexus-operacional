import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface AuditInput {
  userId?: string;
  module: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId && input.userId !== "system" ? input.userId : undefined,
        module: input.module,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        before: input.before === undefined ? undefined : (input.before as object),
        after: input.after === undefined ? undefined : (input.after as object),
        reason: input.reason
      }
    });
  }

  list(query: { module?: string; action?: string; userId?: string; take?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        module: query.module,
        action: query.action,
        userId: query.userId
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(query.take ?? 100), 500),
      include: { user: { select: { id: true, name: true, email: true } } }
    });
  }
}
