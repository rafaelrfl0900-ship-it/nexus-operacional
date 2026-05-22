import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { OverweightService } from "./overweight.service";

@Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
@Controller("overweight")
export class OverweightController {
  constructor(private readonly overweight: OverweightService) {}

  @Get("ranking")
  ranking(@Query("weekId") weekId?: string) {
    return this.overweight.ranking(weekId);
  }
}
