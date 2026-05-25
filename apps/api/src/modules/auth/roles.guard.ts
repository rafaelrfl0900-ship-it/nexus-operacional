import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { RoleCode, ROLES_KEY } from "./roles.decorator";

interface HttpRequestWithUser {
  user?: CurrentUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest<HttpRequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException("Sessao ausente ou expirada.");
    }

    if (user.roles.includes("ADMIN")) return true;
    if (requiredRoles.some((role) => user.roles.includes(role))) return true;

    throw new ForbiddenException("Perfil sem permissao para esta acao.");
  }
}
