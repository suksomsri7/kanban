"use client";

import { useSession } from "next-auth/react";
import { useState, useRef } from "react";
import { Settings, Lock, Check, Database, Download, Upload, AlertTriangle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { changeOwnPassword } from "@/actions/user";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  }

  async function handleBackup() {
    setBackupLoading(true);
    setBackupMsg("");
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kanban-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg("Backup downloaded successfully!");
    } catch {
      setBackupMsg("Failed to create backup");
    }
    setBackupLoading(false);
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: This will replace ALL existing data with the backup. This cannot be undone. Are you sure?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setRestoreLoading(true);
    setBackupMsg("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        setBackupMsg(`Restore successful! ${result.message}`);
      } else {
        setBackupMsg(result.error || "Restore failed");
      }
    } catch {
      setBackupMsg("Invalid backup file");
    }
    setRestoreLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Account settings and preferences</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Profile Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <Avatar name={user.displayName} size="lg" />
            <div>
              <p className="text-lg font-medium text-gray-900">{user.displayName}</p>
              <p className="text-sm text-gray-500">@{user.username}</p>
              <Badge className="mt-1">{user.role.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>

          {success && (
            <div className="mb-4 flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-100">
              <Check size={16} />
              <span className="text-sm">Password changed successfully!</span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-100 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password (min 6 chars)"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
            />
            <div className="pt-2">
              <Button type="submit" loading={loading}>
                Update Password
              </Button>
            </div>
          </form>
        </div>

        {/* Backup & Restore (Super Admin only) */}
        {isSuperAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Backup & Restore</h2>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Export all data as JSON or restore from a previous backup file.
            </p>

            {backupMsg && (
              <div className={`mb-4 px-4 py-3 rounded-lg border text-sm ${
                backupMsg.includes("successful") || backupMsg.includes("success")
                  ? "bg-green-50 text-green-700 border-green-100"
                  : "bg-red-50 text-red-700 border-red-100"
              }`}>
                {backupMsg}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleBackup} loading={backupLoading} variant="secondary">
                <Download size={16} className="mr-1.5" />
                Export Backup
              </Button>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                  id="restore-file"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  loading={restoreLoading}
                  variant="secondary"
                >
                  <Upload size={16} className="mr-1.5" />
                  Restore from Backup
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 bg-amber-50 text-amber-700 px-4 py-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs">
                Restoring a backup will <strong>replace all existing data</strong>. Make sure to export a backup first.
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">
            <Settings size={14} className="inline mr-1.5 -mt-0.5" />
            For other account changes (display name, role, avatar), contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
