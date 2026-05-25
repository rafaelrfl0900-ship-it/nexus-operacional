import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { AuditService } from "./audit.service";

@Roles("ADMIN", "MANAGER")
@Controller("audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: { module?: string; action?: string; userId?: string; take?: string }) {
    return this.audit.list(query);
  }
}
