import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role as Role)) {
    redirect("/");
  }
  return session;
}

export async function requireSuperAdmin() {
  return requireRole(Role.SUPER_ADMIN);
}

export async function requireAdmin() {
  return requireRole(Role.SUPER_ADMIN, Role.ADMIN);
}
