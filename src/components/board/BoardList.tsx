"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Kanban, Users, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { createBoard, deleteBoard } from "@/actions/board";
import { useRouter } from "next/navigation";

interface BoardData {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  owner: { id: string; displayName: string; username: string };
  members: { user: { id: string; displayName: string; avatar: string | null } }[];
  _count: { columns: number };
}

interface TemplateData {
  id: string;
  name: string;
}

interface BoardListProps {
  boards: BoardData[];
  templates: TemplateData[];
  isAdmin: boolean;
}

export default function BoardList({ boards, templates, isAdmin }: BoardListProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createBoard(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setShowCreate(false);
      router.push(`/board/${result.boardId}`);
    }
    setLoading(false);
  }

  async function handleDelete(boardId: string, title: string) {
    if (!confirm(`Delete board "${title}"? This action cannot be undone.`)) return;
    await deleteBoard(boardId);
    router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {boards.map((board) => (
          <div
            key={board.id}
            className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden"
          >
            <Link href={`/board/${board.id}`} className="block p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: board.color || "#111827" }}
                >
                  <Kanban size={20} className="text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 truncate">
                {board.title}
              </h3>
              {board.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {board.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex -space-x-2">
                  {board.members.slice(0, 4).map((m) => (
                    <Avatar
                      key={m.user.id}
                      name={m.user.displayName}
                      src={m.user.avatar}
                      size="sm"
                    />
                  ))}
                  {board.members.length > 4 && (
                    <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
                      +{board.members.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {board._count.columns} columns
                </span>
              </div>
            </Link>
            {isAdmin && (
              <div className="px-5 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(board.id, board.title)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all min-h-[160px]"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">New Board</span>
          </button>
        )}
      </div>

      {boards.length === 0 && !isAdmin && (
        <div className="text-center py-16">
          <Kanban size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
          <p className="text-gray-500 text-sm">You haven&apos;t been added to any boards yet.</p>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Board">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <Input name="title" label="Board Title" required placeholder="e.g. Project Alpha" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template
            </label>
            <select
              name="templateId"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">Default (To Do / In Progress / Done)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Board
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
