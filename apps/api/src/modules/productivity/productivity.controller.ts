import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { ProductivityService } from "./productivity.service";

@Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
@Controller("productivity")
export class ProductivityController {
  constructor(private readonly productivity: ProductivityService) {}

  @Get("summary")
  summary(@Query("weekId") weekId?: string) {
    return this.productivity.summary(weekId);
  }
}
