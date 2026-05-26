import { describe, expect, it } from "vitest";
import { JwtAuthGuard } from "../../apps/api/src/modules/auth/jwt-auth.guard";
import { RolesGuard } from "../../apps/api/src/modules/auth/roles.guard";
import { IS_PUBLIC_KEY } from "../../apps/api/src/modules/auth/public.decorator";
import { ROLES_KEY } from "../../apps/api/src/modules/auth/roles.decorator";

function httpContext(request: Record<string, unknown>) {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as never;
}

describe("auth guards", () => {
  it("allows public routes without a bearer token", async () => {
    const guard = new JwtAuthGuard(
      { getAllAndOverride: (key: string) => key === IS_PUBLIC_KEY } as never,
      { verifyAsync: async () => ({}) } as never
    );

    await expect(guard.canActivate(httpContext({ headers: {} }))).resolves.toBe(true);
  });

  it("attaches the current user from a valid JWT", async () => {
    const request: Record<string, unknown> = { headers: { authorization: "Bearer token" } };
    const guard = new JwtAuthGuard(
      { getAllAndOverride: () => false } as never,
      { verifyAsync: async () => ({ sub: "user-1", email: "admin@nexus.local", roles: ["ADMIN"] }) } as never
    );

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "admin@nexus.local", roles: ["ADMIN"] });
  });

  it("attaches the current user from the HTTP-only session cookie", async () => {
    const request: Record<string, unknown> = { headers: { cookie: "nexus_session=token" } };
    const guard = new JwtAuthGuard(
      { getAllAndOverride: () => false } as never,
      { verifyAsync: async () => ({ sub: "user-1", email: "admin@nexus.local", roles: ["ADMIN"] }) } as never
    );

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: "user-1", email: "admin@nexus.local", roles: ["ADMIN"] });
  });

  it("blocks users outside the required role set", () => {
    const guard = new RolesGuard({
      getAllAndOverride: (key: string) => (key === ROLES_KEY ? ["MANAGER"] : false)
    } as never);

    expect(() =>
      guard.canActivate(httpContext({ headers: {}, user: { id: "1", email: "op@nexus.local", roles: ["OPERATOR"] } }))
    ).toThrow("Perfil sem permissao");
  });
});
