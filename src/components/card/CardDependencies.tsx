"use client";

import { useState, useEffect, useTransition } from "react";
import { Link2, Plus, X, ArrowRight } from "lucide-react";
import {
  addDependency,
  removeDependency,
  getAvailableCardsForDependency,
} from "@/actions/dependency";

interface Dependency {
  id: string;
  blocking: { id: string; title: string };
}

interface DependedBy {
  id: string;
  dependent: { id: string; title: string };
}

interface CardDependenciesProps {
  cardId: string;
  boardId: string;
  dependencies: Dependency[];
  dependedBy: DependedBy[];
  isEditor: boolean;
  onRefresh: () => void;
  onCardClick: (cardId: string) => void;
}

type AvailableCard = { id: string; title: string; column: { title: string } };

export default function CardDependencies({
  cardId,
  boardId,
  dependencies,
  dependedBy,
  isEditor,
  onRefresh,
  onCardClick,
}: CardDependenciesProps) {
  const [adding, setAdding] = useState(false);
  const [availableCards, setAvailableCards] = useState<AvailableCard[]>([]);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (adding) {
      getAvailableCardsForDependency(boardId, cardId).then(setAvailableCards);
    }
  }, [adding, boardId, cardId]);

  const filtered = availableCards.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) &&
      !dependencies.some((d) => d.blocking.id === c.id)
  );

  async function handleAdd(blockingId: string) {
    startTransition(async () => {
      const result = await addDependency(cardId, blockingId, boardId);
      if (result.error) alert(result.error);
      else {
        onRefresh();
        setAdding(false);
        setSearch("");
      }
    });
  }

  async function handleRemove(depId: string) {
    startTransition(async () => {
      await removeDependency(depId, boardId);
      onRefresh();
    });
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
        <Link2 size={14} />
        Dependencies
      </h4>

      {dependencies.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Blocked by</p>
          {dependencies.map((dep) => (
            <div key={dep.id} className="flex items-center gap-2 py-1 group">
              <ArrowRight size={12} className="text-red-400 shrink-0" />
              <button
                onClick={() => onCardClick(dep.blocking.id)}
                className="text-sm text-gray-700 hover:text-black truncate flex-1 text-left"
              >
                {dep.blocking.title}
              </button>
              {isEditor && (
                <button
                  onClick={() => handleRemove(dep.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {dependedBy.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Blocking</p>
          {dependedBy.map((dep) => (
            <div key={dep.id} className="flex items-center gap-2 py-1">
              <ArrowRight size={12} className="text-amber-400 shrink-0 rotate-180" />
              <button
                onClick={() => onCardClick(dep.dependent.id)}
                className="text-sm text-gray-700 hover:text-black truncate flex-1 text-left"
              >
                {dep.dependent.title}
              </button>
            </div>
          ))}
        </div>
      )}

      {isEditor && (
        adding ? (
          <div className="border border-gray-200 rounded-lg p-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards..."
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded mb-1 focus:outline-none focus:ring-1 focus:ring-black"
              autoFocus
            />
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">No cards found</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleAdd(c.id)}
                    disabled={isPending}
                    className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-50 truncate"
                  >
                    <span className="text-gray-700">{c.title}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({c.column.title})</span>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => { setAdding(false); setSearch(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 mt-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <Plus size={12} /> Add dependency
          </button>
        )
      )}
    </div>
  );
}
