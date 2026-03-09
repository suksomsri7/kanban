"use client";

import { useState } from "react";
import { Plus, RotateCcw, UserX, Pencil, Trash2, Bot } from "lucide-react";
import { Role } from "@prisma/client";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import {
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  permanentlyDeleteUser,
} from "@/actions/user";

interface UserData {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  isAgent: boolean;
  telegramChatId: string | null;
  createdAt: Date;
  customRoleId: string | null;
  customRole: { id: string; name: string; color: string | null } | null;
}

interface CustomRoleOption {
  id: string;
  name: string;
  color: string | null;
}

interface UserManagementProps {
  initialUsers: UserData[];
  customRoles: CustomRoleOption[];
}

export default function UserManagement({ initialUsers, customRoles }: UserManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("User created successfully");
      setShowCreateModal(false);
      window.location.reload();
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateUser(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("User updated successfully");
      setShowEditModal(false);
      window.location.reload();
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;

    if (!selectedUser) return;
    const result = await resetUserPassword(selectedUser.id, newPassword);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Password reset successfully");
      setShowResetModal(false);
    }
    setLoading(false);
  }

  async function handleDeactivate(userId: string) {
    if (!confirm("Are you sure you want to deactivate this user?")) return;
    clearMessages();

    const result = await deleteUser(userId);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  async function handlePermanentDelete(userId: string, displayName: string) {
    if (!confirm(`Permanently delete "${displayName}"? This cannot be undone.`)) return;
    clearMessages();
    setLoading(true);

    const result = await permanentlyDeleteUser(userId);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("User deleted permanently");
      window.location.reload();
    }
    setLoading(false);
  }

  function roleBadgeVariant(
    role: Role
  ): "default" | "success" | "warning" | "danger" {
    switch (role) {
      case "SUPER_ADMIN":
        return "danger";
      case "ADMIN":
        return "warning";
      case "USER":
        return "default";
      case "GUEST":
        return "success";
    }
  }

  return (
    <div>
      {success && (
        <div className="mb-4 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-100">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {initialUsers.length} users total
        </p>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus size={16} className="mr-1" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                System Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Custom Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.displayName} size="sm" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900">
                          {u.displayName}
                        </p>
                        {u.isAgent && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                            <Bot size={10} /> Agent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={roleBadgeVariant(u.role)}>
                    {u.role.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {u.customRole ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: u.customRole.color || "#6b7280" }}
                    >
                      {u.customRole.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={u.isActive ? "success" : "default"}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowEditModal(true);
                        clearMessages();
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit user"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowResetModal(true);
                        clearMessages();
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Reset password"
                    >
                      <RotateCcw size={16} />
                    </button>
                    {u.isActive && u.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Deactivate user"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                    {u.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => handlePermanentDelete(u.id, u.displayName)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete user permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            name="username"
            label="Username"
            required
            placeholder="e.g. john_doe"
          />
          <Input
            name="displayName"
            label="Display Name"
            required
            placeholder="e.g. John Doe"
          />
          <Input
            name="password"
            label="Password"
            type="password"
            required
            placeholder="Minimum 6 characters"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              System Role
            </label>
            <select
              name="role"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              defaultValue="USER"
            >
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
              <option value="GUEST">Guest</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Role
              <span className="text-xs text-gray-400 ml-1">(permissions)</span>
            </label>
            {customRoles.length > 0 ? (
              <select
                name="customRoleId"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                defaultValue=""
              >
                <option value="">No custom role</option>
                {customRoles.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-400 py-2 px-3 border border-dashed border-gray-200 rounded-lg">
                No custom roles available. Go to <strong className="text-gray-600">Roles</strong> menu to create one.
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
              <Bot size={14} className="text-violet-600" /> Agent Settings
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isAgent" value="true" className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">This is an AI Agent (OpenClaw)</span>
              </label>
              <Input
                name="telegramChatId"
                label="Telegram Chat ID"
                placeholder="e.g. 123456789"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        {selectedUser && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <input type="hidden" name="id" value={selectedUser.id} />
            <Input
              name="displayName"
              label="Display Name"
              required
              defaultValue={selectedUser.displayName}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Role
              </label>
              <select
                name="role"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                defaultValue={selectedUser.role}
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
                <option value="GUEST">Guest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Role
                <span className="text-xs text-gray-400 ml-1">(permissions)</span>
              </label>
              <select
                name="customRoleId"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                defaultValue={selectedUser.customRoleId || ""}
              >
                <option value="">No custom role</option>
                {customRoles.map((cr) => (
                  <option key={cr.id} value={cr.id}>{cr.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="isActive"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                defaultValue={selectedUser.isActive ? "true" : "false"}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                <Bot size={14} className="text-violet-600" /> Agent Settings
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI Agent
                  </label>
                  <select
                    name="isAgent"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    defaultValue={selectedUser.isAgent ? "true" : "false"}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes (OpenClaw Agent)</option>
                  </select>
                </div>
                <Input
                  name="telegramChatId"
                  label="Telegram Chat ID"
                  placeholder="e.g. 123456789"
                  defaultValue={selectedUser.telegramChatId || ""}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Password"
      >
        {selectedUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-gray-600">
              Reset password for{" "}
              <strong>{selectedUser.displayName}</strong> (@
              {selectedUser.username})
            </p>
            <Input
              name="newPassword"
              label="New Password"
              type="password"
              required
              placeholder="Minimum 6 characters"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
