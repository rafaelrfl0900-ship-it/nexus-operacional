import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { CurrentUserData } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { ProductionService } from "./production.service";

@Controller("production")
export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get()
  list(@Query() query: { weekId?: string; sector?: "P1" | "P2"; productId?: string; op?: string }) {
    return this.production.list(query);
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get("p1")
  listP1(@Query() query: { weekId?: string; productId?: string; op?: string }) {
    return this.production.list({ ...query, sector: "P1" });
  }

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get("p2")
  listP2(@Query() query: { weekId?: string; productId?: string; op?: string }) {
    return this.production.list({ ...query, sector: "P2" });
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR")
  @Post("preview")
  preview(@Body() body: unknown) {
    return this.production.preview(body);
  }

  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  @Post()
  create(@Body() body: unknown, @CurrentUserData() user?: CurrentUser) {
    return this.production.create(body, user);
  }

  @Roles("ADMIN", "SUPERVISOR", "OPERATOR")
  @Post(":id/duplicate")
  duplicate(@Param("id") id: string, @CurrentUserData() user?: CurrentUser) {
    return this.production.duplicate(id, user);
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Delete(":id")
  softDelete(@Param("id") id: string, @CurrentUserData() user?: CurrentUser) {
    return this.production.softDelete(id, user);
  }
}
