export interface CurrentUser {
  id: string;
  email: string;
  roles: string[];
}

export const systemUser: CurrentUser = {
  id: "system",
  email: "system@nexus.local",
  roles: ["ADMIN"]
};
