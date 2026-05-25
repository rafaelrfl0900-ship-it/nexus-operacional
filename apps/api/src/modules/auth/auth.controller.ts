import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "./public.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Public()
  @Post("logout")
  logout() {
    return { ok: true };
  }
}
