import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/types";

export type BoardPermission =
  | "canView"
  | "canCreateCard"
  | "canEditCard"
  | "canDeleteCard"
  | "canMoveCard"
  | "canComment"
  | "canAddColumn"
  | "canEditColumn"
  | "canDeleteColumn";

export interface UserBoardPermissions {
  hasAccess: boolean;
  canView: boolean;
  canCreateCard: boolean;
  canEditCard: boolean;
  canDeleteCard: boolean;
  canMoveCard: boolean;
  canComment: boolean;
  canAddColumn: boolean;
  canEditColumn: boolean;
  canDeleteColumn: boolean;
  allowedColumnIds: string[];
  isFullAccess: boolean;
}

const FULL_ACCESS: UserBoardPermissions = {
  hasAccess: true,
  canView: true,
  canCreateCard: true,
  canEditCard: true,
  canDeleteCard: true,
  canMoveCard: true,
  canComment: true,
  canAddColumn: true,
  canEditColumn: true,
  canDeleteColumn: true,
  allowedColumnIds: [],
  isFullAccess: true,
};

const NO_ACCESS: UserBoardPermissions = {
  hasAccess: false,
  canView: false,
  canCreateCard: false,
  canEditCard: false,
  canDeleteCard: false,
  canMoveCard: false,
  canComment: false,
  canAddColumn: false,
  canEditColumn: false,
  canDeleteColumn: false,
  allowedColumnIds: [],
  isFullAccess: false,
};

export async function getUserBoardPermissions(boardId: string): Promise<UserBoardPermissions> {
  const session = await auth();
  if (!session?.user) return NO_ACCESS;

  const user = session.user as SessionUser;

  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    return FULL_ACCESS;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { customRoleId: true },
  });

  if (!dbUser?.customRoleId) {
    if (user.role === "USER") return FULL_ACCESS;
    return { ...NO_ACCESS, hasAccess: true, canView: true };
  }

  const access = await prisma.customRoleBoardAccess.findUnique({
    where: {
      customRoleId_boardId: {
        customRoleId: dbUser.customRoleId,
        boardId,
      },
    },
  });

  if (!access) return NO_ACCESS;

  const colIds = typeof access.allowedColumnIds === "string"
    ? JSON.parse(access.allowedColumnIds)
    : access.allowedColumnIds;

  return {
    hasAccess: true,
    canView: access.canView,
    canCreateCard: access.canCreateCard,
    canEditCard: access.canEditCard,
    canDeleteCard: access.canDeleteCard,
    canMoveCard: access.canMoveCard,
    canComment: access.canComment,
    canAddColumn: access.canAddColumn,
    canEditColumn: access.canEditColumn,
    canDeleteColumn: access.canDeleteColumn,
    allowedColumnIds: Array.isArray(colIds) ? colIds : [],
    isFullAccess: false,
  };
}

export function canAccessColumn(permissions: UserBoardPermissions, columnId: string): boolean {
  if (permissions.isFullAccess) return true;
  if (permissions.allowedColumnIds.length === 0) return true;
  return permissions.allowedColumnIds.includes(columnId);
}
