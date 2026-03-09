import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/types";

export interface UserBoardPermissions {
  hasAccess: boolean;
  isFullAccess: boolean;
  canView: boolean;
  canCreateCard: boolean;
  canDeleteCard: boolean;
  canMoveCard: boolean;

  canEditCardTitle: boolean;
  canEditCardDescription: boolean;
  canEditCardPriority: boolean;
  canEditCardDueDate: boolean;
  canEditCardLabels: boolean;
  canManageLabels: boolean;
  canEditCardAssignees: boolean;
  canManageSubtasks: boolean;
  canUploadAttachment: boolean;
  canAddDependency: boolean;
  canComment: boolean;

  canAddColumn: boolean;
  canEditColumn: boolean;
  canDeleteColumn: boolean;

  allowedColumnIds: string[];
}

const FULL_ACCESS: UserBoardPermissions = {
  hasAccess: true,
  isFullAccess: true,
  canView: true,
  canCreateCard: true,
  canDeleteCard: true,
  canMoveCard: true,
  canEditCardTitle: true,
  canEditCardDescription: true,
  canEditCardPriority: true,
  canEditCardDueDate: true,
  canEditCardLabels: true,
  canManageLabels: true,
  canEditCardAssignees: true,
  canManageSubtasks: true,
  canUploadAttachment: true,
  canAddDependency: true,
  canComment: true,
  canAddColumn: true,
  canEditColumn: true,
  canDeleteColumn: true,
  allowedColumnIds: [],
};

const NO_ACCESS: UserBoardPermissions = {
  hasAccess: false,
  isFullAccess: false,
  canView: false,
  canCreateCard: false,
  canDeleteCard: false,
  canMoveCard: false,
  canEditCardTitle: false,
  canEditCardDescription: false,
  canEditCardPriority: false,
  canEditCardDueDate: false,
  canEditCardLabels: false,
  canManageLabels: false,
  canEditCardAssignees: false,
  canManageSubtasks: false,
  canUploadAttachment: false,
  canAddDependency: false,
  canComment: false,
  canAddColumn: false,
  canEditColumn: false,
  canDeleteColumn: false,
  allowedColumnIds: [],
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
    isFullAccess: false,
    canView: access.canView,
    canCreateCard: access.canCreateCard,
    canDeleteCard: access.canDeleteCard,
    canMoveCard: access.canMoveCard,
    canEditCardTitle: access.canEditCardTitle,
    canEditCardDescription: access.canEditCardDescription,
    canEditCardPriority: access.canEditCardPriority,
    canEditCardDueDate: access.canEditCardDueDate,
    canEditCardLabels: access.canEditCardLabels,
    canManageLabels: access.canManageLabels,
    canEditCardAssignees: access.canEditCardAssignees,
    canManageSubtasks: access.canManageSubtasks,
    canUploadAttachment: access.canUploadAttachment,
    canAddDependency: access.canAddDependency,
    canComment: access.canComment,
    canAddColumn: access.canAddColumn,
    canEditColumn: access.canEditColumn,
    canDeleteColumn: access.canDeleteColumn,
    allowedColumnIds: Array.isArray(colIds) ? colIds : [],
  };
}

export function canAccessColumn(permissions: UserBoardPermissions, columnId: string): boolean {
  if (permissions.isFullAccess) return true;
  if (permissions.allowedColumnIds.length === 0) return true;
  return permissions.allowedColumnIds.includes(columnId);
}
