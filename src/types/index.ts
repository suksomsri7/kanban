import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  avatar?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }

  interface User extends SessionUser {}
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser {}
}
