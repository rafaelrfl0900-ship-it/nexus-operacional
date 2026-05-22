import { Body, Controller, Get, Post } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator";
import { UsersService } from "./users.service";

@Roles("ADMIN")
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.users.create(body);
  }
}
