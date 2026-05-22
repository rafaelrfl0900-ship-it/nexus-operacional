import { Body, Controller, Get, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { GoalsService } from "./goals.service";

@Controller("goals")
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
  @Get()
  list() {
    return this.goals.list();
  }

  @Roles("ADMIN", "MANAGER")
  @Post()
  create(@Body() body: unknown) {
    return this.goals.create(body);
  }
}
