import {
  getCustomRoles,
  getAllBoardsWithColumns,
  getAllUsersForAssignment,
} from "@/actions/custom-role";
import RolesManager from "@/components/admin/RolesManager";

export default async function RolesPage() {
  const [customRoles, boards, users] = await Promise.all([
    getCustomRoles(),
    getAllBoardsWithColumns(),
    getAllUsersForAssignment(),
  ]);

  return (
    <RolesManager
      customRoles={customRoles}
      boards={boards}
      users={users}
    />
  );
}
