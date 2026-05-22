import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaService } from "../../infrastructure/database/prisma.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(payload: unknown) {
    const input = loginSchema.parse(payload);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: { include: { role: true } } }
    });

    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Credenciais invalidas.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const roles = user.roles.map((item) => item.role.code);
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, roles });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles
      }
    };
  }
}
