"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  X,
  FolderKanban,
  Kanban,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  assignUserToBrand,
  removeUserFromBrand,
  assignUserToBoard,
  removeUserFromBoard,
  updateUserRole,
  toggleUserActive,
} from "@/actions/role";

type UserWithAccess = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatar: string | null;
  isActive: boolean;
  brandMembers: {
    brandId: string;
    role: string;
    brand: { id: string; name: string; color: string | null };
  }[];
  boardMembers: {
    boardId: string;
    role: string;
    board: {
      id: string;
      title: string;
      brandId: string | null;
      brand: { name: string } | null;
    };
  }[];
};

type BrandWithBoards = {
  id: string;
  name: string;
  color: string | null;
  boards: { id: string; title: string }[];
};

interface Props {
  users: UserWithAccess[];
  brandsWithBoards: BrandWithBoards[];
}

export default function RolesManager({ users, brandsWithBoards }: Props) {
  const router = useRouter();
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [assignType, setAssignType] = useState<"brand" | "board">("brand");
  const [selectedId, setSelectedId] = useState("");
  const [assignRole, setAssignRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAssign() {
    if (!selectedId || !showAssign) return;
    setLoading(true);
    if (assignType === "brand") {
      await assignUserToBrand(showAssign, selectedId, assignRole);
    } else {
      await assignUserToBoard(showAssign, selectedId, assignRole);
    }
    setLoading(false);
    setShowAssign(null);
    setSelectedId("");
    router.refresh();
  }

  async function handleRoleChange(userId: string, role: string) {
    setLoading(true);
    await updateUserRole(userId, role as "SUPER_ADMIN" | "ADMIN" | "USER" | "GUEST");
    setLoading(false);
    router.refresh();
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setLoading(true);
    await toggleUserActive(userId, isActive);
    setLoading(false);
    router.refresh();
  }

  async function handleRemoveBrand(userId: string, brandId: string) {
    if (!confirm("Remove this user from the brand?")) return;
    await removeUserFromBrand(userId, brandId);
    router.refresh();
  }

  async function handleRemoveBoard(userId: string, boardId: string) {
    if (!confirm("Remove this user from this board?")) return;
    await removeUserFromBoard(userId, boardId);
    router.refresh();
  }

  const allBoards = brandsWithBoards.flatMap((b) =>
    b.boards.map((board) => ({
      ...board,
      brandName: b.name,
      brandId: b.id,
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Access</h1>
          <p className="text-gray-500 mt-1">
            Assign users to brands and boards
          </p>
        </div>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {filtered.map((user) => {
          const isExpanded = expandedUser === user.id;
          return (
            <div key={user.id}>
              <button
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                )}
                <Avatar name={user.displayName} src={user.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {user.displayName}
                    </span>
                    <span className="text-xs text-gray-400">@{user.username}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge>{user.role.replace("_", " ")}</Badge>
                    {!user.isActive && <Badge variant="default">Inactive</Badge>}
                    <span className="text-xs text-gray-400">
                      {user.brandMembers.length} brands · {user.boardMembers.length} boards
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAssign(user.id);
                    setAssignType("brand");
                    setSelectedId("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Assign access"
                >
                  <Plus size={16} />
                </button>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 bg-gray-50/50">
                  <div className="pl-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          System Role
                        </label>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.role === "SUPER_ADMIN"}
                          className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="ADMIN">Admin</option>
                          <option value="USER">User</option>
                          <option value="GUEST">Guest</option>
                        </select>
                      </div>
                      {user.role !== "SUPER_ADMIN" && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Status
                          </label>
                          <button
                            onClick={() => handleToggleActive(user.id, !user.isActive)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              user.isActive ? "bg-green-500" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                user.isActive ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <span className={`text-xs font-medium ${user.isActive ? "text-green-600" : "text-gray-400"}`}>
                            {user.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      )}
                    </div>

                    {user.brandMembers.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Brand Access
                        </p>
                        <div className="space-y-1.5">
                          {user.brandMembers.map((bm) => (
                            <div
                              key={bm.brandId}
                              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: bm.brand.color || "#111827" }}
                                />
                                <FolderKanban size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-700">{bm.brand.name}</span>
                                <Badge>{bm.role}</Badge>
                              </div>
                              <button
                                onClick={() => handleRemoveBrand(user.id, bm.brandId)}
                                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.boardMembers.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Board Access
                        </p>
                        <div className="space-y-1.5">
                          {user.boardMembers.map((bm) => (
                            <div
                              key={bm.boardId}
                              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100"
                            >
                              <div className="flex items-center gap-2">
                                <Kanban size={14} className="text-gray-400" />
                                <span className="text-sm text-gray-700">{bm.board.title}</span>
                                {bm.board.brand && (
                                  <span className="text-xs text-gray-400">
                                    ({bm.board.brand.name})
                                  </span>
                                )}
                                <Badge>{bm.role}</Badge>
                              </div>
                              <button
                                onClick={() => handleRemoveBoard(user.id, bm.boardId)}
                                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {user.brandMembers.length === 0 && user.boardMembers.length === 0 && (
                      <p className="text-sm text-gray-400 py-2">
                        No access assigned yet. Click + to assign.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Shield size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No users found</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={!!showAssign}
        onClose={() => setShowAssign(null)}
        title="Assign Access"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAssignType("brand");
                  setSelectedId("");
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  assignType === "brand"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FolderKanban size={14} className="inline mr-1.5" />
                Brand
              </button>
              <button
                onClick={() => {
                  setAssignType("board");
                  setSelectedId("");
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  assignType === "board"
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Kanban size={14} className="inline mr-1.5" />
                Board
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {assignType === "brand" ? "Brand" : "Board"}
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select {assignType === "brand" ? "a brand" : "a board"}...</option>
              {assignType === "brand"
                ? brandsWithBoards.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))
                : allBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.brandName})
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as "EDITOR" | "VIEWER")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowAssign(null)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} loading={loading} disabled={!selectedId}>
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
