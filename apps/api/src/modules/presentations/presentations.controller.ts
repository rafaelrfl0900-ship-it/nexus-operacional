import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { CurrentUserData } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { PresentationsService } from "./presentations.service";

@Roles("ADMIN", "MANAGER", "SUPERVISOR", "VIEWER")
@Controller("presentations")
export class PresentationsController {
  constructor(private readonly presentations: PresentationsService) {}

  @Get("executive")
  executive(@Query("weekId") weekId: string | undefined, @CurrentUserData() user?: CurrentUser) {
    return this.presentations.executiveDeck(weekId, user);
  }
}
