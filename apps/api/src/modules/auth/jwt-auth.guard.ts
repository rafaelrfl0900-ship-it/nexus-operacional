import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { IS_PUBLIC_KEY } from "./public.decorator";

interface JwtClaims {
  sub?: string;
  email?: string;
  roles?: string[];
}

interface HttpRequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: CurrentUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<HttpRequestWithUser>();
    const token = this.extractBearerToken(request.headers.authorization) ?? this.extractCookieToken(request);
    if (!token) {
      throw new UnauthorizedException("Sessao ausente ou expirada.");
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtClaims>(token);
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException("Sessao invalida.");
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        roles: payload.roles ?? []
      };
      return true;
    } catch {
      throw new UnauthorizedException("Sessao invalida ou expirada.");
    }
  }

  private extractBearerToken(header: string | string[] | undefined) {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) return null;
    const [scheme, token] = value.split(" ");
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
  }

  private extractCookieToken(request: HttpRequestWithUser) {
    if (request.cookies?.nexus_session) return request.cookies.nexus_session;

    const rawCookie = request.headers.cookie;
    const cookieHeader = Array.isArray(rawCookie) ? rawCookie.join("; ") : rawCookie;
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((part) => part.trim());
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.split("=");
      if (name === "nexus_session") {
        return decodeURIComponent(valueParts.join("="));
      }
    }
    return null;
  }
}
