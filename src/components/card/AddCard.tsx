"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { generateKeyBetween } from "fractional-indexing";
import { createCard } from "@/actions/card";
import { useRouter } from "next/navigation";

interface AddCardProps {
  columnId: string;
  lastOrder: string | null;
}

export default function AddCard({ columnId, lastOrder }: AddCardProps) {
  const router = useRouter();
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
    formData.set("columnId", columnId);
    formData.set("order", newOrder);

    await createCard(formData);
    setTitle("");
    setLoading(false);
    router.refresh();
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 w-full px-2 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Plus size={14} />
        Add card
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Card title..."
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white resize-none"
        rows={2}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
          if (e.key === "Escape") {
            setAdding(false);
            setTitle("");
          }
        }}
      />
      <div className="flex items-center gap-2 mt-1">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-3 py-1 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => { setAdding(false); setTitle(""); }}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X size={16} />
        </button>
      </div>
    </form>
  );
}
