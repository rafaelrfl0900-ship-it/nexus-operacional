import { Module } from "@nestjs/common";
import { WeeksController } from "./weeks.controller";
import { WeeksService } from "./weeks.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [WeeksController],
  providers: [WeeksService],
  exports: [WeeksService]
})
export class WeeksModule {}
