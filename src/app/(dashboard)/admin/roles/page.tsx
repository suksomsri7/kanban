import { getUsersWithAccess, getAllBrandsWithBoards } from "@/actions/role";
import RolesManager from "@/components/admin/RolesManager";

export default async function RolesPage() {
  const [users, brandsWithBoards] = await Promise.all([
    getUsersWithAccess(),
    getAllBrandsWithBoards(),
  ]);

  return <RolesManager users={users} brandsWithBoards={brandsWithBoards} />;
}
