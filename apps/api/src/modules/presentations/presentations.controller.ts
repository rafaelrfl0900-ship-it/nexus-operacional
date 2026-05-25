import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { PresentationsService } from "./presentations.service";

@Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
@Controller("presentations")
export class PresentationsController {
  constructor(private readonly presentations: PresentationsService) {}

  @Get("executive")
  executive(@Query("weekId") weekId?: string) {
    return this.presentations.executiveDeck(weekId);
  }
}
