import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { PresentationsController } from "./presentations.controller";
import { PresentationsService } from "./presentations.service";

@Module({
  imports: [DashboardModule, AuditModule],
  controllers: [PresentationsController],
  providers: [PresentationsService]
})
export class PresentationsModule {}
