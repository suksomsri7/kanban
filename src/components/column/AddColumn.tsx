"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { generateKeyBetween } from "fractional-indexing";
import { createColumn } from "@/actions/column";
import { useRouter } from "next/navigation";

interface AddColumnProps {
  boardId: string;
  lastOrder: string | null;
}

export default function AddColumn({ boardId, lastOrder }: AddColumnProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const newOrder = generateKeyBetween(lastOrder, null);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("boardId", boardId);
    formData.set("order", newOrder);

    await createColumn(formData);
    setTitle("");
    setAdding(false);
    setLoading(false);
    startTransition(() => router.refresh());
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-500 hover:text-gray-700 transition-colors w-[280px] sm:w-72 shrink-0"
      >
        <Plus size={16} />
        Add column
      </button>
    );
  }

  return (
    <div className="bg-gray-100 rounded-xl p-3 w-[280px] sm:w-72 shrink-0">
      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Column title..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white"
          autoFocus
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setTitle(""); }}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
