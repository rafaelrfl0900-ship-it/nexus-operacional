import { Module } from "@nestjs/common";
import { PresentationsController } from "./presentations.controller";
import { PresentationsService } from "./presentations.service";
import { DashboardModule } from "../dashboard/dashboard.module";

@Module({
  imports: [DashboardModule],
  controllers: [PresentationsController],
  providers: [PresentationsService]
})
export class PresentationsModule {}
