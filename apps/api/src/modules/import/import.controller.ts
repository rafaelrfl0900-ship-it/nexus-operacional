import { Body, Controller, Get, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { ImportService } from "./import.service";

@Roles("ADMIN", "SUPERVISOR")
@Controller("import")
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Get("preview")
  preview() {
    return this.imports.preview();
  }

  @Post("batches")
  registerBatch(@Body() body: { sourceFile?: string }) {
    return this.imports.registerBatch(body.sourceFile ?? process.env.LEGACY_EXCEL_PATH ?? "legacy.xlsx");
  }

  @Post("products")
  importProducts(@Body() body: { sourceFile?: string }) {
    return this.imports.importProducts(body.sourceFile);
  }
}
