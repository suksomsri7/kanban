import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getBrands } from "@/actions/brand";
import { getUserMenuPermissions } from "@/lib/permissions";
import AppLayout from "@/components/layout/AppLayout";
import type { SessionUser } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as SessionUser;
  const [brands, menuPerms] = await Promise.all([
    getBrands(),
    getUserMenuPermissions(),
  ]);
  const brandNav = brands.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
  }));

  return (
    <AppLayout user={user} brands={brandNav} menuPermissions={menuPerms}>
      {children}
    </AppLayout>
  );
}
