import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { DowntimeService } from "./downtime.service";

@Controller("downtime")
export class DowntimeController {
  constructor(private readonly downtime: DowntimeService) {}

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get()
  list(@Query() query: { weekId?: string; reasonId?: string }) {
    return this.downtime.list(query);
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get("reasons")
  reasons() {
    return this.downtime.reasons();
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
  @Get("summary")
  summary(@Query("weekId") weekId?: string) {
    return this.downtime.summary(weekId);
  }

  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  @Post()
  create(@Body() body: unknown) {
    return this.downtime.create(body);
  }
}
