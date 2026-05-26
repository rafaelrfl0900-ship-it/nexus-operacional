import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../../infrastructure/security/current-user";
import { CurrentUserData } from "../auth/current-user.decorator";
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
  create(@Body() body: unknown, @CurrentUserData() user?: CurrentUser) {
    return this.users.create(body, user);
  }
}
