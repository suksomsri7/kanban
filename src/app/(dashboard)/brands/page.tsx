import { auth } from "@/lib/auth";
import { getBrands } from "@/actions/brand";
import BrandList from "@/components/brand/BrandList";
import type { SessionUser } from "@/types";

export default async function BrandsPage() {
  const session = await auth();
  const user = session!.user as SessionUser;
  const brands = await getBrands();
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
        <p className="text-gray-500 mt-1">Organize your boards into brands</p>
      </div>
      <BrandList brands={brands} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
