import { Module } from "@nestjs/common";
import { DowntimeController } from "./downtime.controller";
import { DowntimeService } from "./downtime.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [DowntimeController],
  providers: [DowntimeService]
})
export class DowntimeModule {}
