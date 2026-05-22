import { Module } from "@nestjs/common";
import { LossesController } from "./losses.controller";
import { LossesService } from "./losses.service";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  controllers: [LossesController],
  providers: [LossesService]
})
export class LossesModule {}
