"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, X, CheckSquare, Square, Trash2 } from "lucide-react";
import { createSubtask, toggleSubtask, deleteSubtask } from "@/actions/subtask";

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  order: string;
  cardId: string;
}

interface CardSubtasksProps {
  subtasks: Subtask[];
  cardId: string;
  boardId: string;
  isEditor: boolean;
  onUpdate?: (subtasks: Subtask[]) => void;
  onRefresh?: () => void;
}

export default function CardSubtasks({
  subtasks: initialSubtasks,
  cardId,
  boardId,
  isEditor,
  onUpdate,
  onRefresh,
}: CardSubtasksProps) {
  const [items, setItems] = useState(initialSubtasks);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setItems(initialSubtasks); }, [initialSubtasks]);

  const completed = items.filter((s) => s.isCompleted).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  function notify(next: Subtask[]) {
    if (onUpdate) onUpdate(next);
    else if (onRefresh) onRefresh();
  }

  async function handleAdd() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const result = await createSubtask(cardId, newTitle, boardId);
      setNewTitle("");
      if (result && "subtask" in result && result.subtask) {
        const next = [...items, result.subtask as Subtask];
        setItems(next);
        notify(next);
      }
    });
  }

  async function handleToggle(subtaskId: string) {
    const next = items.map((s) => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
    setItems(next);
    notify(next);
    startTransition(async () => {
      await toggleSubtask(subtaskId, boardId);
    });
  }

  async function handleDelete(subtaskId: string) {
    const next = items.filter((s) => s.id !== subtaskId);
    setItems(next);
    notify(next);
    startTransition(async () => {
      await deleteSubtask(subtaskId, boardId);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <CheckSquare size={14} />
          Checklist
          {total > 0 && (
            <span className="text-xs text-gray-400 ml-1">
              {completed}/{total}
            </span>
          )}
        </h4>
      </div>

      {total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
          <div
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor: percent === 100 ? "#22c55e" : "#111827",
            }}
          />
        </div>
      )}

      <div className="space-y-1 mb-2">
        {items.map((st) => (
          <div key={st.id} className="flex items-center gap-2 group py-0.5">
            {isEditor ? (
              <button
                onClick={() => handleToggle(st.id)}
                className="text-gray-400 hover:text-gray-700 shrink-0"
              >
                {st.isCompleted ? (
                  <CheckSquare size={16} className="text-green-600" />
                ) : (
                  <Square size={16} />
                )}
              </button>
            ) : st.isCompleted ? (
              <CheckSquare size={16} className="text-green-600 shrink-0" />
            ) : (
              <Square size={16} className="text-gray-400 shrink-0" />
            )}
            <span
              className={`text-sm flex-1 ${
                st.isCompleted ? "text-gray-400 line-through" : "text-gray-700"
              }`}
            >
              {st.title}
            </span>
            {isEditor && (
              <button
                onClick={() => handleDelete(st.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditor && (
        adding ? (
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Subtask title..."
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
              }}
            />
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || isPending}
              className="px-2 py-1 bg-black text-white text-xs rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewTitle(""); }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1"
          >
            <Plus size={12} /> Add subtask
          </button>
        )
      )}
    </div>
  );
}
