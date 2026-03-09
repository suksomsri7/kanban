import { requireSuperAdmin } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import UserManagement from "@/components/admin/UserManagement";

export default async function AdminUsersPage() {
  await requireSuperAdmin();

  const [users, customRoles] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        isAgent: true,
        telegramChatId: true,
        createdAt: true,
        customRoleId: true,
        customRole: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customRole.findMany({
      select: { id: true, name: true, color: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">
          Create and manage user accounts
        </p>
      </div>
      <UserManagement initialUsers={users} customRoles={customRoles} />
    </div>
  );
}
