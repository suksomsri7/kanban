"use client";

import { useState, memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Pencil, Trash2, GripVertical, Lock, Settings, Bot } from "lucide-react";
import CardThumb from "@/components/card/CardThumb";
import AddCard from "@/components/card/AddCard";
import ColumnSettingsDialog from "./ColumnSettingsDialog";
import { updateColumn, deleteColumn } from "@/actions/column";

interface ColumnProps {
  column: {
    id: string;
    title: string;
    order: string;
    cards: any[];
    automationType?: string;
    automationStatus?: string;
  };
  boardId: string;
  labels: any[];
  isEditor: boolean;
  canCreateCard?: boolean;
  canMoveCard?: boolean;
  canEditColumn?: boolean;
  canDeleteColumn?: boolean;
  restricted?: boolean;
  onCardClick?: (cardId: string) => void;
}

export default memo(function Column({ column, boardId, labels, isEditor, canCreateCard = true, canMoveCard = true, canEditColumn = true, canDeleteColumn = true, restricted = false, onCardClick }: ColumnProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
    disabled: !canMoveCard,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleTitleSave() {
    if (title.trim() && title.trim() !== column.title) {
      await updateColumn(column.id, title.trim());
    } else {
      setTitle(column.title);
    }
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete column "${column.title}"?`)) return;
    const result = await deleteColumn(column.id);
    if (result.error) alert(result.error);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col rounded-xl w-[280px] sm:w-72 shrink-0 max-h-full ${restricted ? "bg-gray-200/60" : "bg-gray-100"}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {restricted && (
            <Lock size={14} className="text-gray-400 shrink-0 mr-0.5" />
          )}
          {canMoveCard && !restricted && (
            <button
              {...attributes}
              {...listeners}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical size={16} />
            </button>
          )}
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
            />
          ) : (
            <h3
              className="text-sm font-semibold text-gray-900 truncate cursor-pointer"
              onDoubleClick={() => isEditor && canEditColumn && setEditing(true)}
            >
              {column.title}
            </h3>
          )}
          <span className="text-xs text-gray-400 ml-1 shrink-0">
            {column.cards.length}
          </span>
          {column.automationStatus === "run" && (
            <span className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0" title={column.automationType === "openclaw" ? "Agent active" : "AI automation active"}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <Bot size={12} />
            </span>
          )}
        </div>

        {isEditor && (canEditColumn || canDeleteColumn) && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-36">
                  {canEditColumn && (
                    <button
                      onClick={() => { setShowSettings(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings size={14} /> Settings
                    </button>
                  )}
                  {canEditColumn && (
                    <button
                      onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={14} /> Rename
                    </button>
                  )}
                  {canDeleteColumn && (
                    <button
                      onClick={() => { handleDelete(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[40px]">
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <CardThumb
              key={card.id}
              card={card}
              onCardClick={restricted ? () => {} : (onCardClick || (() => {}))}
              canDrag={!restricted && canMoveCard}
              restricted={restricted}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Card */}
      {canCreateCard && (
        <div className="px-2 pb-2">
          <AddCard
            columnId={column.id}
            lastOrder={column.cards.length > 0 ? column.cards[column.cards.length - 1].order : null}
          />
        </div>
      )}

      {/* Column Settings Dialog */}
      {showSettings && (
        <ColumnSettingsDialog
          columnId={column.id}
          columnTitle={column.title}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
});
