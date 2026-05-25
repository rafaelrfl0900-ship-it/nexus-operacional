import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CurrentUser } from "../../infrastructure/security/current-user";

export const CurrentUserData = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: CurrentUser }>();
    return request.user;
  }
);
