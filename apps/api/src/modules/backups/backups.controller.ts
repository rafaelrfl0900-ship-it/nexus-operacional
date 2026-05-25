import { Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { CurrentUserData } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { BackupsService } from "./backups.service";

@Roles("ADMIN", "MANAGER")
@Controller("backups")
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get()
  list(@Query() query: { status?: string; take?: string }) {
    return this.backups.list(query);
  }

  @Post()
  create(@CurrentUserData() user?: CurrentUser) {
    return this.backups.create(user);
  }
}
