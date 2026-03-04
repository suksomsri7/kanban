import { auth } from "@/lib/auth";
import { getBrands } from "@/actions/brand";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  const user = session!.user as SessionUser;
  const brands = await getBrands();

  if (brands.length === 1) {
    redirect(`/brand/${brands[0].id}`);
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Select a Brand</h1>
        <p className="text-gray-500 mt-1">Choose a brand to view its dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brand/${brand.id}`}
            className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden"
          >
            <div
              className="h-2 w-full"
              style={{ backgroundColor: brand.color || "#111827" }}
            />
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: brand.color || "#111827" }}
                >
                  <FolderKanban size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-black">
                    {brand.name}
                  </h3>
                  {brand.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                      {brand.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{brand._count.boards} boards</span>
                <span>{brand.members.length} members</span>
              </div>
            </div>
          </Link>
        ))}

        {isSuperAdmin && (
          <Link
            href="/admin/roles"
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all min-h-[160px]"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">Manage Brands & Roles</span>
          </Link>
        )}
      </div>

      {brands.length === 0 && (
        <div className="text-center py-16">
          <FolderKanban size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No brands available</h3>
          <p className="text-gray-500 text-sm">
            {isSuperAdmin
              ? "Create your first brand to get started."
              : "You haven't been added to any brands yet."}
          </p>
        </div>
      )}
    </div>
  );
}
