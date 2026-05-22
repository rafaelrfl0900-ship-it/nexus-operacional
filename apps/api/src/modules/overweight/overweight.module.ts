import { Module } from "@nestjs/common";
import { OverweightController } from "./overweight.controller";
import { OverweightService } from "./overweight.service";

@Module({
  controllers: [OverweightController],
  providers: [OverweightService]
})
export class OverweightModule {}
