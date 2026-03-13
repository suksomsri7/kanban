"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Key,
  ToggleLeft,
  ToggleRight,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import {
  createApiKey,
  deleteApiKey,
  toggleApiKey,
  updateApiKeyScopes,
} from "@/actions/api-key";
import {
  API_KEY_SCOPES,
  SCOPE_LABELS,
  SCOPE_GROUPS,
  type ApiKeyScope,
} from "@/lib/api-key";

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: unknown;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  user: { id: string; username: string; displayName: string };
}

interface UserOption {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface Props {
  initialKeys: ApiKeyData[];
  users: UserOption[];
}

export default function ApiKeyManagement({ initialKeys, users }: Props) {
  const [keys, setKeys] = useState(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [showScopes, setShowScopes] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formUserId, setFormUserId] = useState("");
  const [formScopes, setFormScopes] = useState<Set<ApiKeyScope>>(new Set());
  const [formExpiry, setFormExpiry] = useState("");

  const [editScopes, setEditScopes] = useState<Set<ApiKeyScope>>(new Set());

  function resetForm() {
    setFormName("");
    setFormUserId("");
    setFormScopes(new Set());
    setFormExpiry("");
    setError("");
  }

  function toggleFormScope(scope: ApiKeyScope) {
    setFormScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  }

  function selectAllFormScopes() {
    setFormScopes(new Set(API_KEY_SCOPES));
  }

  function clearAllFormScopes() {
    setFormScopes(new Set());
  }

  async function handleCreate() {
    setLoading(true);
    setError("");

    const result = await createApiKey({
      name: formName,
      userId: formUserId,
      scopes: Array.from(formScopes),
      expiresAt: formExpiry || null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || "Failed to create API key");
      return;
    }

    setNewKey(result.rawKey!);
    setShowCreate(false);
    resetForm();

    const { getApiKeys } = await import("@/actions/api-key");
    const updated = await getApiKeys();
    setKeys(updated);
  }

  async function handleToggle(id: string) {
    await toggleApiKey(id);
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k))
    );
  }

  async function handleDelete(id: string) {
    await deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    setShowDelete(null);
  }

  async function handleUpdateScopes(id: string) {
    setLoading(true);
    const result = await updateApiKeyScopes(id, Array.from(editScopes));
    setLoading(false);
    if (result.success) {
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, scopes: Array.from(editScopes) } : k
        )
      );
      setShowScopes(null);
    }
  }

  function openScopeEditor(key: ApiKeyData) {
    const scopes = Array.isArray(key.scopes) ? key.scopes : [];
    setEditScopes(new Set(scopes as ApiKeyScope[]));
    setShowScopes(key.id);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isExpired(key: ApiKeyData) {
    return key.expiresAt && new Date(key.expiresAt) < new Date();
  }

  const scopeKey = showScopes
    ? keys.find((k) => k.id === showScopes)
    : null;

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {keys.length} key{keys.length !== 1 ? "s" : ""}
        </p>
        <Button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          size="sm"
        >
          <Plus size={16} className="mr-1.5" />
          Create API Key
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Security Notice</p>
          <p className="mt-0.5">
            API keys grant access to your data. Use the{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">
              x-api-key
            </code>{" "}
            header for external services. Keys are shown only once at creation.
          </p>
        </div>
      </div>

      {/* Keys table */}
      {keys.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Key size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No API keys yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create one to allow external services to access the API
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Key
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Scopes
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Last Used
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const scopes = Array.isArray(key.scopes)
                    ? key.scopes
                    : [];
                  const expired = isExpired(key);

                  return (
                    <tr
                      key={key.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {key.name}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Created {formatDate(key.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">
                          {key.keyPrefix}••••••••
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">
                          {key.user.displayName}
                        </span>
                        <span className="text-gray-400 text-xs ml-1">
                          @{key.user.username}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openScopeEditor(key)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Shield size={12} />
                          {scopes.length} scope{scopes.length !== 1 ? "s" : ""}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {key.lastUsedAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(key.lastUsedAt)}
                          </span>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Expired
                          </span>
                        ) : key.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                            Disabled
                          </span>
                        )}
                        {key.expiresAt && !expired && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Expires {formatDate(key.expiresAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(key.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title={
                              key.isActive ? "Disable key" : "Enable key"
                            }
                          >
                            {key.isActive ? (
                              <ToggleRight
                                size={18}
                                className="text-green-600"
                              />
                            ) : (
                              <ToggleLeft
                                size={18}
                                className="text-gray-400"
                              />
                            )}
                          </button>
                          <button
                            onClick={() => setShowDelete(key.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create API Key"
        size="lg"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <Input
            label="Key Name"
            placeholder="e.g., n8n Integration, Zapier Webhook"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Owner User
            </label>
            <select
              value={formUserId}
              onChange={(e) => setFormUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} (@{u.username}) — {u.role}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              API actions will be performed as this user
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Permissions (Scopes)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllFormScopes}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select all
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={clearAllFormScopes}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-3 bg-gray-50 rounded-lg p-3">
              {SCOPE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.scopes.map((scope) => (
                      <label
                        key={scope}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formScopes.has(scope)}
                          onChange={() => toggleFormScope(scope)}
                          className="rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm text-gray-700">
                          {SCOPE_LABELS[scope]}
                        </span>
                        <code className="text-[10px] text-gray-400 font-mono ml-auto">
                          {scope}
                        </code>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiration (optional)
            </label>
            <input
              type="datetime-local"
              value={formExpiry}
              onChange={(e) => setFormExpiry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Leave empty for a key that never expires
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={loading}>
              Create Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Key Reveal Modal */}
      <Modal
        isOpen={!!newKey}
        onClose={() => setNewKey(null)}
        title="API Key Created"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle
              size={16}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <p className="text-sm text-amber-800">
              Copy this key now. It will not be shown again.
            </p>
          </div>

          <div className="relative">
            <code className="block bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono break-all select-all">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey!)}
              className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? (
                <Check size={16} className="text-green-400" />
              ) : (
                <Copy size={16} className="text-gray-300" />
              )}
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-600 mb-2">
              Usage example:
            </p>
            <code className="text-xs text-gray-500 font-mono block whitespace-pre-wrap">{`curl -H "x-api-key: ${newKey}" \\
  ${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/boards`}</code>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Scopes Modal */}
      <Modal
        isOpen={!!showScopes}
        onClose={() => setShowScopes(null)}
        title={`Edit Scopes — ${scopeKey?.name || ""}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-3 bg-gray-50 rounded-lg p-3">
            {SCOPE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.scopes.map((scope) => (
                    <label
                      key={scope}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={editScopes.has(scope)}
                        onChange={() => {
                          setEditScopes((prev) => {
                            const next = new Set(prev);
                            if (next.has(scope)) next.delete(scope);
                            else next.add(scope);
                            return next;
                          });
                        }}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">
                        {SCOPE_LABELS[scope]}
                      </span>
                      <code className="text-[10px] text-gray-400 font-mono ml-auto">
                        {scope}
                      </code>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowScopes(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleUpdateScopes(showScopes!)}
              loading={loading}
            >
              Save Scopes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDelete}
        onClose={() => setShowDelete(null)}
        title="Delete API Key"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this API key? Any integrations
            using it will immediately stop working. This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(showDelete!)}
            >
              Delete Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
