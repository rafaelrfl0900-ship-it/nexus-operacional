import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { AuditService } from "../audit/audit.service";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  roles: z.array(z.enum(["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER"])).default(["VIEWER"])
});

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        lastLoginAt: true,
        roles: { include: { role: true } }
      }
    });
  }

  async create(payload: unknown, currentUser?: CurrentUser) {
    const input = createUserSchema.parse(payload);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, 12)
      }
    });

    const roles = await this.prisma.role.findMany({ where: { code: { in: input.roles } } });
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
      skipDuplicates: true
    });

    const created = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, active: true, roles: { include: { role: true } } }
    });
    await this.audit.record({
      userId: this.safeUserId(currentUser),
      module: "users",
      action: "create",
      entity: "User",
      entityId: user.id,
      after: created
    });
    return created;
  }

  private safeUserId(user?: CurrentUser) {
    return user?.id && uuidPattern.test(user.id) ? user.id : undefined;
  }
}
