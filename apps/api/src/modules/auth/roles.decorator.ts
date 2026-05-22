import { SetMetadata } from "@nestjs/common";

export type RoleCode = "ADMIN" | "MANAGER" | "SUPERVISOR" | "OPERATOR" | "VIEWER";

export const ROLES_KEY = "nexus:roles";

export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
