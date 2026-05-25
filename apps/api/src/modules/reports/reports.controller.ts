import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { ReportsService } from "./reports.service";

@Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("weekly-production")
  weeklyProduction(@Query("weekId") weekId?: string) {
    return this.reports.weeklyProduction(weekId);
  }
}
