import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";

@Module({
  imports: [AuditModule],
  controllers: [ImportController],
  providers: [ImportService]
})
export class ImportModule {}
