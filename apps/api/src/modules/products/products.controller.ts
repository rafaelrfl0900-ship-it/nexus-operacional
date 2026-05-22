import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Roles("ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "VIEWER")
  @Get()
  list(@Query() query: { active?: string; search?: string }) {
    return this.products.list(query);
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Post()
  create(@Body() body: unknown) {
    return this.products.create(body);
  }

  @Roles("ADMIN", "SUPERVISOR")
  @Patch(":id")
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.products.update(id, body);
  }

  @Roles("ADMIN")
  @Delete(":id")
  deactivate(@Param("id") id: string) {
    return this.products.deactivate(id);
  }
}
