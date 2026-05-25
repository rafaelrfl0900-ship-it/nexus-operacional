import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { LossesService } from "./losses.service";

@Controller("losses")
export class LossesController {
  constructor(private readonly losses: LossesService) {}

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get()
  list(@Query() query: { weekId?: string; typeId?: string }) {
    return this.losses.list(query);
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get("types")
  types() {
    return this.losses.types();
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
  @Get("summary")
  summary(@Query("weekId") weekId?: string) {
    return this.losses.summary(weekId);
  }

  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  @Post()
  create(@Body() body: unknown) {
    return this.losses.create(body);
  }
}
