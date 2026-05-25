import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { WeeksService } from "./weeks.service";

@Controller("weeks")
export class WeeksController {
  constructor(private readonly weeks: WeeksService) {}

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get()
  list() {
    return this.weeks.list();
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR")
  @Post()
  create(@Body() body: unknown) {
    return this.weeks.create(body);
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR")
  @Patch(":id/close")
  close(@Param("id") id: string) {
    return this.weeks.close(id);
  }

  @Roles("ADMIN", "MANAGER")
  @Patch(":id/reopen")
  reopen(@Param("id") id: string, @Body() body: { reason?: string }) {
    return this.weeks.reopen(id, body?.reason);
  }

  @Roles("ADMIN", "MANAGER")
  @Patch(":id/archive")
  archive(@Param("id") id: string) {
    return this.weeks.archive(id);
  }
}
