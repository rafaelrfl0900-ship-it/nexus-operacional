import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { CurrentUserData } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";

const sessionCookieName = "nexus_session";
const sessionFlagCookieName = "nexus_session_active";

function sessionCookieOptions() {
  const maxAge = Number(process.env.JWT_ACCESS_COOKIE_MAX_AGE_MS ?? 15 * 60 * 1000);
  const sameSite = (process.env.AUTH_COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/",
    maxAge
  };
}

function sessionFlagCookieOptions() {
  const { httpOnly: _httpOnly, ...options } = sessionCookieOptions();
  return options;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("login")
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(body);
    response.cookie(sessionCookieName, session.accessToken, sessionCookieOptions());
    response.cookie(sessionFlagCookieName, "1", sessionFlagCookieOptions());
    return {
      accessToken: "cookie-session",
      user: session.user
    };
  }

  @Get("me")
  async me(@CurrentUserData() user: CurrentUser | undefined) {
    return {
      accessToken: "cookie-session",
      user: await this.auth.me(user)
    };
  }

  @Post("logout")
  async logout(@CurrentUserData() user: CurrentUser | undefined, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(user);
    response.clearCookie(sessionCookieName, { path: "/" });
    response.clearCookie(sessionFlagCookieName, { path: "/" });
    return { ok: true };
  }
}
