import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

function jwtAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_ACCESS_SECRET must be set in production.");
  }
  return "dev-access-secret";
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtAccessSecret(),
      signOptions: { expiresIn: (process.env.JWT_ACCESS_TTL ?? "15m") as never }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard]
})
export class AuthModule {}
