"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Kanban,
  Users,
  Check,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  setRoleBoardAccess,
  removeRoleBoardAccess,
  assignUserCustomRole,
} from "@/actions/custom-role";

type BoardWithColumns = {
  id: string;
  title: string;
  brandId: string | null;
  brand: { name: string } | null;
  columns: { id: string; title: string; order: string }[];
};

type BoardAccess = {
  id: string;
  customRoleId: string;
  boardId: string;
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
  allowedColumnIds: unknown;
  board: BoardWithColumns;
};

type CustomRoleData = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  canViewDashboard: boolean;
  canViewReports: boolean;
  _count: { users: number };
  boardAccess: BoardAccess[];
  users: { id: string; username: string; displayName: string; avatar: string | null }[];
};

type UserForAssignment = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: string;
  customRoleId: string | null;
};

interface Props {
  customRoles: CustomRoleData[];
  boards: BoardWithColumns[];
  users: UserForAssignment[];
}

const ROLE_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

const PERMISSION_GROUPS = [
  {
    label: "Board",
    perms: [
      { key: "canView", label: "View Board" },
    ],
  },
  {
    label: "Card",
    perms: [
      { key: "canCreateCard", label: "Create Card" },
      { key: "canDeleteCard", label: "Delete Card" },
      { key: "canMoveCard", label: "Move Card" },
    ],
  },
  {
    label: "Card Edit",
    perms: [
      { key: "canEditCardTitle", label: "Edit Title" },
      { key: "canEditCardDescription", label: "Edit Description" },
      { key: "canEditCardPriority", label: "Change Priority" },
      { key: "canEditCardDueDate", label: "Set Due Date" },
      { key: "canEditCardLabels", label: "Assign Labels" },
      { key: "canManageLabels", label: "Create/Edit/Delete Labels" },
      { key: "canEditCardAssignees", label: "Edit Assignees" },
      { key: "canManageSubtasks", label: "Manage Subtasks" },
      { key: "canUploadAttachment", label: "Upload Attachment" },
      { key: "canAddDependency", label: "Add Dependency" },
    ],
  },
  {
    label: "Comment",
    perms: [
      { key: "canComment", label: "Comment" },
    ],
  },
  {
    label: "Column",
    perms: [
      { key: "canAddColumn", label: "Add Column" },
      { key: "canEditColumn", label: "Edit Column" },
      { key: "canDeleteColumn", label: "Delete Column" },
    ],
  },
];

const ALL_PERM_KEYS = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));
const ALL_PERM_LABEL_MAP: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => [p.key, p.label]))
);

export default function RolesManager({ customRoles, boards, users }: Props) {
  const router = useRouter();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRoleData | null>(null);
  const [selectedBoardAccess, setSelectedBoardAccess] = useState<BoardAccess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Board access modal state
  const [boardModalRoleId, setBoardModalRoleId] = useState("");
  const [boardModalBoardId, setBoardModalBoardId] = useState("");
  const defaultPerms: Record<string, boolean> = Object.fromEntries(
    ALL_PERM_KEYS.map((k) => [k, k === "canView"])
  );
  const [boardPerms, setBoardPerms] = useState<Record<string, boolean>>(defaultPerms);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createCustomRole(formData);
    if (result.error) setError(result.error);
    else { setShowCreateModal(false); router.refresh(); }
    setLoading(false);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedRole) return;
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateCustomRole(selectedRole.id, formData);
    if (result.error) setError(result.error);
    else { setShowEditModal(false); router.refresh(); }
    setLoading(false);
  }

  async function handleDelete(roleId: string, name: string) {
    if (!confirm(`Delete role "${name}"? Users with this role will be unassigned.`)) return;
    await deleteCustomRole(roleId);
    router.refresh();
  }

  function openAddBoard(roleId: string) {
    setBoardModalRoleId(roleId);
    setBoardModalBoardId("");
    setBoardPerms({ ...defaultPerms });
    setSelectedColumns([]);
    setSelectedBoardAccess(null);
    setError("");
    setShowBoardModal(true);
  }

  function openEditBoard(access: BoardAccess) {
    setBoardModalRoleId(access.customRoleId);
    setBoardModalBoardId(access.boardId);
    setBoardPerms(
      Object.fromEntries(ALL_PERM_KEYS.map((k) => [k, !!(access as any)[k]]))
    );
    const colIds = typeof access.allowedColumnIds === "string"
      ? JSON.parse(access.allowedColumnIds)
      : access.allowedColumnIds;
    setSelectedColumns(Array.isArray(colIds) ? colIds : []);
    setSelectedBoardAccess(access);
    setError("");
    setShowBoardModal(true);
  }

  async function handleSaveBoardAccess() {
    if (!boardModalBoardId) { setError("Please select a board"); return; }
    setLoading(true);
    setError("");
    const result = await setRoleBoardAccess({
      customRoleId: boardModalRoleId,
      boardId: boardModalBoardId,
      canView: !!boardPerms.canView,
      canCreateCard: !!boardPerms.canCreateCard,
      canDeleteCard: !!boardPerms.canDeleteCard,
      canMoveCard: !!boardPerms.canMoveCard,
      canEditCardTitle: !!boardPerms.canEditCardTitle,
      canEditCardDescription: !!boardPerms.canEditCardDescription,
      canEditCardPriority: !!boardPerms.canEditCardPriority,
      canEditCardDueDate: !!boardPerms.canEditCardDueDate,
      canEditCardLabels: !!boardPerms.canEditCardLabels,
      canManageLabels: !!boardPerms.canManageLabels,
      canEditCardAssignees: !!boardPerms.canEditCardAssignees,
      canManageSubtasks: !!boardPerms.canManageSubtasks,
      canUploadAttachment: !!boardPerms.canUploadAttachment,
      canAddDependency: !!boardPerms.canAddDependency,
      canComment: !!boardPerms.canComment,
      canAddColumn: !!boardPerms.canAddColumn,
      canEditColumn: !!boardPerms.canEditColumn,
      canDeleteColumn: !!boardPerms.canDeleteColumn,
      allowedColumnIds: selectedColumns,
    });
    if (result.error) setError(result.error);
    else { setShowBoardModal(false); router.refresh(); }
    setLoading(false);
  }

  async function handleRemoveBoard(roleId: string, boardId: string, boardTitle: string) {
    if (!confirm(`Remove access to "${boardTitle}"?`)) return;
    await removeRoleBoardAccess(roleId, boardId);
    router.refresh();
  }

  async function handleAssignUser(userId: string, roleId: string | null) {
    await assignUserCustomRole(userId, roleId);
    router.refresh();
  }

  const currentBoardColumns = boards.find((b) => b.id === boardModalBoardId)?.columns ?? [];
  const role = customRoles.find((r) => r.id === boardModalRoleId);
  const existingBoardIds = role?.boardAccess.map((ba) => ba.boardId) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">
            Create custom roles and define board/column access
          </p>
        </div>
        <Button onClick={() => { setError(""); setShowCreateModal(true); }} size="sm">
          <Plus size={16} className="mr-1" /> Create Role
        </Button>
      </div>

      {customRoles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Shield size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No custom roles yet</h3>
          <p className="text-gray-400 text-sm mb-4">Create a role to define permissions for your users</p>
          <Button onClick={() => { setError(""); setShowCreateModal(true); }} size="sm">
            <Plus size={16} className="mr-1" /> Create Role
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {customRoles.map((cr) => {
            const isExpanded = expandedRole === cr.id;
            return (
              <div key={cr.id}>
                <button
                  onClick={() => setExpandedRole(isExpanded ? null : cr.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {isExpanded
                    ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />
                  }
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cr.color || "#6b7280" }}
                  >
                    <Shield size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{cr.name}</span>
                      <span className="text-xs text-gray-400">
                        {cr._count.users} user{cr._count.users !== 1 && "s"} · {cr.boardAccess.length} board{cr.boardAccess.length !== 1 && "s"}
                      </span>
                    </div>
                    {cr.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{cr.description}</p>
                    )}
                    <div className="flex gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cr.canViewDashboard ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-400 border border-gray-100 line-through"}`}>
                        Dashboard
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cr.canViewReports ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-400 border border-gray-100 line-through"}`}>
                        Reports
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setSelectedRole(cr); setShowUsersModal(true); }}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Manage users"
                    >
                      <Users size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedRole(cr); setError(""); setShowEditModal(true); }}
                      className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Edit role"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cr.id, cr.name)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete role"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 bg-gray-50/50">
                    <div className="pl-8">
                      {/* Assigned Users */}
                      {cr.users.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Assigned Users
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {cr.users.map((u) => (
                              <div key={u.id} className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 border border-gray-100 text-sm">
                                <Avatar name={u.displayName} src={u.avatar} size="xs" />
                                <span className="text-gray-700">{u.displayName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Board Access */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Board Access & Permissions
                          </p>
                          <button
                            onClick={() => openAddBoard(cr.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <Plus size={12} /> Add Board
                          </button>
                        </div>

                        {cr.boardAccess.length === 0 ? (
                          <p className="text-sm text-gray-400 py-2">No board access configured.</p>
                        ) : (
                          <div className="space-y-2">
                            {cr.boardAccess.map((ba) => {
                              const colIds = typeof ba.allowedColumnIds === "string"
                                ? JSON.parse(ba.allowedColumnIds as string)
                                : ba.allowedColumnIds;
                              const allowedCols: string[] = Array.isArray(colIds) ? colIds : [];

                              return (
                                <div key={ba.id} className="bg-white rounded-lg border border-gray-100 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Kanban size={14} className="text-gray-400" />
                                      <span className="text-sm font-medium text-gray-800">{ba.board.title}</span>
                                      {ba.board.brand && (
                                        <span className="text-xs text-gray-400">({ba.board.brand.name})</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => openEditBoard(ba)}
                                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                        title="Edit permissions"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={() => handleRemoveBoard(cr.id, ba.boardId, ba.board.title)}
                                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {ALL_PERM_KEYS.map((key) => (
                                      <span
                                        key={key}
                                        className={`text-xs px-2 py-0.5 rounded-full ${
                                          (ba as any)[key]
                                            ? "bg-green-50 text-green-700 border border-green-200"
                                            : "bg-gray-50 text-gray-400 border border-gray-100 line-through"
                                        }`}
                                      >
                                        {ALL_PERM_LABEL_MAP[key]}
                                      </span>
                                    ))}
                                  </div>
                                  {allowedCols.length > 0 && (
                                    <div className="mt-1.5">
                                      <span className="text-xs text-gray-400">Allowed columns: </span>
                                      {ba.board.columns
                                        .filter((c) => allowedCols.includes(c.id))
                                        .map((c) => (
                                          <span key={c.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">
                                            {c.title}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                  {allowedCols.length === 0 && (
                                    <div className="mt-1.5">
                                      <span className="text-xs text-gray-400">Allowed columns: </span>
                                      <span className="text-xs text-green-600">All columns</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Role Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Role">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          <Input name="name" label="Role Name" required placeholder="e.g. CS1, Sales Team" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              placeholder="What can this role do?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="color" value={c} className="sr-only peer" defaultChecked={c === ROLE_COLORS[0]} />
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-transparent peer-checked:border-gray-900 peer-checked:ring-2 peer-checked:ring-gray-900/20 transition-all flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Menu Access</label>
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="hidden" name="canViewDashboard" value="false" />
                <input
                  type="checkbox"
                  defaultChecked={true}
                  onChange={(e) => {
                    const hidden = e.target.parentElement?.querySelector('input[type="hidden"]') as HTMLInputElement;
                    if (hidden) hidden.value = e.target.checked ? "true" : "false";
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm text-gray-700">Dashboard</span>
                <span className="text-xs text-gray-400">— View brand dashboard & stats</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="hidden" name="canViewReports" value="false" />
                <input
                  type="checkbox"
                  defaultChecked={false}
                  onChange={(e) => {
                    const hidden = e.target.parentElement?.querySelector('input[type="hidden"]') as HTMLInputElement;
                    if (hidden) hidden.value = e.target.checked ? "true" : "false";
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm text-gray-700">Reports</span>
                <span className="text-xs text-gray-400">— View reports & analytics</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Role</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Role">
        {selectedRole && (
          <form onSubmit={handleEdit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
            <Input name="name" label="Role Name" required defaultValue={selectedRole.name} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                defaultValue={selectedRole.description || ""}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_COLORS.map((c) => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="color" value={c} className="sr-only peer" defaultChecked={c === (selectedRole.color || ROLE_COLORS[0])} />
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-transparent peer-checked:border-gray-900 peer-checked:ring-2 peer-checked:ring-gray-900/20 transition-all flex items-center justify-center"
                      style={{ backgroundColor: c }}
                    >
                      <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" />
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Menu Access</label>
              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="hidden" name="canViewDashboard" value={selectedRole.canViewDashboard ? "true" : "false"} />
                  <input
                    type="checkbox"
                    defaultChecked={selectedRole.canViewDashboard}
                    onChange={(e) => {
                      const hidden = e.target.parentElement?.querySelector('input[type="hidden"]') as HTMLInputElement;
                      if (hidden) hidden.value = e.target.checked ? "true" : "false";
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Dashboard</span>
                  <span className="text-xs text-gray-400">— View brand dashboard & stats</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="hidden" name="canViewReports" value={selectedRole.canViewReports ? "true" : "false"} />
                  <input
                    type="checkbox"
                    defaultChecked={selectedRole.canViewReports}
                    onChange={(e) => {
                      const hidden = e.target.parentElement?.querySelector('input[type="hidden"]') as HTMLInputElement;
                      if (hidden) hidden.value = e.target.checked ? "true" : "false";
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-sm text-gray-700">Reports</span>
                  <span className="text-xs text-gray-400">— View reports & analytics</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" loading={loading}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Board Access Modal */}
      <Modal
        isOpen={showBoardModal}
        onClose={() => setShowBoardModal(false)}
        title={selectedBoardAccess ? "Edit Board Access" : "Add Board Access"}
      >
        <div className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
            <select
              value={boardModalBoardId}
              onChange={(e) => { setBoardModalBoardId(e.target.value); setSelectedColumns([]); }}
              disabled={!!selectedBoardAccess}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50"
            >
              <option value="">Select a board...</option>
              {boards
                .filter((b) => selectedBoardAccess || !existingBoardIds.includes(b.id))
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}{b.brand ? ` (${b.brand.name})` : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-3 max-h-72 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group.label}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const allOn = group.perms.every((p) => boardPerms[p.key]);
                        const updates = Object.fromEntries(group.perms.map((p) => [p.key, !allOn]));
                        setBoardPerms({ ...boardPerms, ...updates });
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800"
                    >
                      {group.perms.every((p) => boardPerms[p.key]) ? "Uncheck all" : "Check all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {group.perms.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={!!boardPerms[p.key]}
                          onChange={(e) => setBoardPerms({ ...boardPerms, [p.key]: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-xs text-gray-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {boardModalBoardId && currentBoardColumns.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed Columns
                <span className="text-xs text-gray-400 ml-1">(leave empty for all)</span>
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2.5">
                {currentBoardColumns.map((col) => (
                  <label key={col.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedColumns([...selectedColumns, col.id]);
                        else setSelectedColumns(selectedColumns.filter((id) => id !== col.id));
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span className="text-sm text-gray-700">{col.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowBoardModal(false)}>Cancel</Button>
            <Button onClick={handleSaveBoardAccess} loading={loading}>
              {selectedBoardAccess ? "Save Changes" : "Add Board"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Users Modal */}
      <Modal
        isOpen={showUsersModal}
        onClose={() => setShowUsersModal(false)}
        title={`Assign Users to "${selectedRole?.name}"`}
      >
        {selectedRole && (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {users.filter((u) => u.role !== "SUPER_ADMIN").map((u) => {
              const isAssigned = u.customRoleId === selectedRole.id;
              return (
                <button
                  key={u.id}
                  onClick={() => handleAssignUser(u.id, isAssigned ? null : selectedRole.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isAssigned ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <Avatar name={u.displayName} src={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">{u.displayName}</span>
                    <span className="text-xs text-gray-400 ml-1.5">@{u.username}</span>
                    {u.customRoleId && u.customRoleId !== selectedRole.id && (
                      <p className="text-xs text-orange-500 mt-0.5">
                        Currently: {customRoles.find((r) => r.id === u.customRoleId)?.name || "Other role"}
                      </p>
                    )}
                  </div>
                  {isAssigned && <Check size={16} className="text-blue-600 shrink-0" />}
                </button>
              );
            })}
            {users.filter((u) => u.role !== "SUPER_ADMIN").length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No users available</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
