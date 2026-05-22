import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  roles: z.array(z.enum(["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER"])).default(["VIEWER"])
});

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(payload: unknown) {
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

    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, active: true, roles: { include: { role: true } } }
    });
  }
}
