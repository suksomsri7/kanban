"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Copy, ArrowRightLeft, Link2 } from "lucide-react";
import {
  getBoardsForPicker,
  duplicateCard,
  crossBoardMoveCard,
  referCard,
} from "@/actions/card";

type Board = { id: string; title: string; columns: { id: string; title: string }[] };

type ActionType = "duplicate" | "move" | "refer";

const ACTION_CONFIG: Record<ActionType, { label: string; icon: typeof Copy; color: string; btnClass: string; description: string }> = {
  duplicate: {
    label: "Duplicate Card",
    icon: Copy,
    color: "text-blue-600",
    btnClass: "bg-blue-600 hover:bg-blue-700",
    description: "Create a copy of this card in the selected board and stage.",
  },
  move: {
    label: "Move Card",
    icon: ArrowRightLeft,
    color: "text-orange-600",
    btnClass: "bg-orange-600 hover:bg-orange-700",
    description: "Move this card to the selected board and stage. It will be removed from the current location.",
  },
  refer: {
    label: "Refer Card",
    icon: Link2,
    color: "text-purple-600",
    btnClass: "bg-purple-600 hover:bg-purple-700",
    description: "Show this card in another board as a reference. The original card stays in place.",
  },
};

interface Props {
  cardId: string;
  cardTitle: string;
  currentBoardId: string;
  action: ActionType;
  onClose: () => void;
  onDone: () => void;
}

export default function CrossBoardDialog({ cardId, cardTitle, currentBoardId, action, onClose, onDone }: Props) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  useEffect(() => {
    getBoardsForPicker().then((data) => {
      setBoards(data);
      setLoading(false);
    });
  }, []);

  const availableBoards = action === "refer"
    ? boards.filter((b) => b.id !== currentBoardId)
    : boards;

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  function handleBoardChange(boardId: string) {
    setSelectedBoardId(boardId);
    setSelectedColumnId("");
    setError("");
  }

  function handleSubmit() {
    if (!selectedBoardId || !selectedColumnId) return;
    setError("");

    startTransition(async () => {
      let result: { success?: boolean; error?: string };
      if (action === "duplicate") {
        result = await duplicateCard(cardId, selectedColumnId, selectedBoardId);
      } else if (action === "move") {
        result = await crossBoardMoveCard(cardId, selectedColumnId, selectedBoardId);
      } else {
        result = await referCard(cardId, selectedColumnId, selectedBoardId);
      }

      if (result.error) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <Icon size={18} className={config.color} />
          <h3 className="text-base font-semibold text-gray-800">{config.label}</h3>
          <button onClick={onClose} className="ml-auto p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">{config.description}</p>

          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-xs text-gray-400">Card</span>
            <p className="text-sm font-medium text-gray-800 truncate">{cardTitle}</p>
          </div>

          {loading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Board
                </label>
                <select
                  value={selectedBoardId}
                  onChange={(e) => handleBoardChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select board...</option>
                  {availableBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} {b.id === currentBoardId ? "(current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBoard && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Stage
                  </label>
                  <select
                    value={selectedColumnId}
                    onChange={(e) => { setSelectedColumnId(e.target.value); setError(""); }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">Select stage...</option>
                    {selectedBoard.columns.map((col) => (
                      <option key={col.id} value={col.id}>{col.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedBoardId || !selectedColumnId || isPending}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.btnClass}`}
          >
            {isPending ? "Processing..." : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}
