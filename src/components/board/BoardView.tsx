"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { generateKeyBetween } from "fractional-indexing";
import { ArrowLeft, Activity, Pencil, Check, X, FileText, Palette, Kanban } from "lucide-react";
import Link from "next/link";
import Column from "@/components/column/Column";
import CardThumb from "@/components/card/CardThumb";
import AddColumn from "@/components/column/AddColumn";
import CardModal from "@/components/card/CardModal";
import ActivityPanel from "./ActivityPanel";
import BoardFilter, { emptyFilter, type FilterState } from "./BoardFilter";
import { reorderCards } from "@/actions/card";
import { reorderColumns } from "@/actions/column";
import { updateBoard } from "@/actions/board";
import type { SessionUser } from "@/types";
import type { UserBoardPermissions } from "@/lib/permissions";
import { useBoardRealtime } from "@/hooks/useRealtime";

type BoardData = NonNullable<Awaited<ReturnType<typeof import("@/actions/board").getBoardById>>>;
type ColumnData = BoardData["columns"][number];
type CardData = ColumnData["cards"][number];
type UserOption = { id: string; displayName: string; username: string; avatar: string | null };

interface BoardViewProps {
  board: BoardData;
  currentUser: SessionUser;
  allUsers: UserOption[];
  permissions?: UserBoardPermissions;
}

export default function BoardView({ board, currentUser, allUsers, permissions }: BoardViewProps) {
  useBoardRealtime(board.id);
  const [columns, setColumns] = useState(board.columns);

  useEffect(() => {
    setColumns(board.columns);
  }, [board.columns]);

  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(board.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(board.description || "");
  const [showDesc, setShowDesc] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

  const BOARD_COLORS = [
    "#111827", "#1e3a5f", "#1e40af", "#3b82f6", "#6366f1",
    "#7c3aed", "#9333ea", "#c026d3", "#db2777", "#e11d48",
    "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d",
    "#16a34a", "#0d9488", "#0891b2", "#0284c7", "#475569",
  ];

  async function handleColorChange(color: string) {
    const formData = new FormData();
    formData.set("id", board.id);
    formData.set("color", color);
    await updateBoard(formData);
    setShowColorPicker(false);
  }

  const canEditBoardDesc = permissions
    ? permissions.isFullAccess || permissions.canEditBoardDescription
    : currentUser.role !== "GUEST";

  const isEditor = permissions
    ? permissions.isFullAccess || permissions.canCreateCard || permissions.canMoveCard ||
      permissions.canEditCardTitle || permissions.canEditCardDescription
    : currentUser.role !== "GUEST";

  const canAddColumn = permissions
    ? permissions.isFullAccess || permissions.canAddColumn
    : currentUser.role !== "GUEST";

  const canEditColumn = permissions
    ? permissions.isFullAccess || permissions.canEditColumn
    : currentUser.role !== "GUEST";

  const canDeleteColumn = permissions
    ? permissions.isFullAccess || permissions.canDeleteColumn
    : currentUser.role !== "GUEST";

  const canCreateCard = permissions
    ? permissions.isFullAccess || permissions.canCreateCard
    : currentUser.role !== "GUEST";

  const canMoveCard = permissions
    ? permissions.isFullAccess || permissions.canMoveCard
    : currentUser.role !== "GUEST";

  async function handleSaveTitle() {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === board.title) {
      setEditTitle(board.title);
      setIsEditingTitle(false);
      return;
    }
    const formData = new FormData();
    formData.set("id", board.id);
    formData.set("title", trimmed);
    await updateBoard(formData);
    setIsEditingTitle(false);
  }

  async function handleSaveDescription() {
    if (editDesc === (board.description || "")) {
      setIsEditingDesc(false);
      return;
    }
    const formData = new FormData();
    formData.set("id", board.id);
    formData.set("description", editDesc);
    await updateBoard(formData);
    setIsEditingDesc(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const allowedColumnIds = permissions?.allowedColumnIds ?? [];
  const hasColumnRestriction = !permissions?.isFullAccess && allowedColumnIds.length > 0;

  const restrictedColumnIds = useMemo(() => {
    if (!hasColumnRestriction) return new Set<string>();
    return new Set(columns.filter((col) => !allowedColumnIds.includes(col.id)).map((col) => col.id));
  }, [columns, hasColumnRestriction, allowedColumnIds]);

  const filteredColumns = useMemo(() => {
    const cols = columns;

    if (!filter.search && !filter.assigneeId && !filter.labelId && !filter.priority) {
      return cols;
    }

    return cols.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        if (filter.search && !card.title.toLowerCase().includes(filter.search.toLowerCase())) {
          return false;
        }
        if (filter.priority && card.priority !== filter.priority) {
          return false;
        }
        if (filter.labelId && !card.labels.some((l) => l.label.id === filter.labelId)) {
          return false;
        }
        if (filter.assigneeId && !card.assignees.some((a) => a.user.id === filter.assigneeId)) {
          return false;
        }
        return true;
      }),
    }));
  }, [columns, filter]);

  const findCardColumn = useCallback(
    (cardId: string) => columns.find((c) => c.cards.some((card) => card.id === cardId)),
    [columns]
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "card") {
      const col = findCardColumn(active.id as string);
      if (col && restrictedColumnIds.has(col.id)) return;
      const card = col?.cards.find((c) => c.id === active.id);
      if (card) setActiveCard(card);
    } else if (type === "column") {
      const col = columns.find((c) => c.id === active.id);
      if (col) setActiveColumn(col);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    if (activeType !== "card") return;

    const activeColIndex = columns.findIndex((c) =>
      c.cards.some((card) => card.id === active.id)
    );
    const overColIndex = over.data.current?.type === "column"
      ? columns.findIndex((c) => c.id === over.id)
      : columns.findIndex((c) => c.cards.some((card) => card.id === over.id));

    if (activeColIndex === -1 || overColIndex === -1 || activeColIndex === overColIndex) return;

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
      const cardIndex = next[activeColIndex].cards.findIndex((c) => c.id === active.id);
      const [movedCard] = next[activeColIndex].cards.splice(cardIndex, 1);

      if (over.data.current?.type === "column") {
        next[overColIndex].cards.push(movedCard);
      } else {
        const overCardIndex = next[overColIndex].cards.findIndex((c) => c.id === over.id);
        next[overColIndex].cards.splice(overCardIndex, 0, movedCard);
      }
      return next;
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setActiveColumn(null);

    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex === newIndex) return;

      const sorted = [...columns];
      const [moved] = sorted.splice(oldIndex, 1);
      sorted.splice(newIndex, 0, moved);

      const newOrder = generateKeyBetween(
        newIndex > 0 ? sorted[newIndex - 1].order : null,
        newIndex < sorted.length - 1 ? sorted[newIndex + 1]?.order ?? null : null
      );

      sorted[newIndex] = { ...moved, order: newOrder };
      setColumns(sorted);
      await reorderColumns(board.id, [{ id: moved.id, order: newOrder }]);
      return;
    }

    if (activeType === "card") {
      const colWithCard = columns.find((c) => c.cards.some((card) => card.id === active.id));
      if (!colWithCard) return;

      const cardIndex = colWithCard.cards.findIndex((c) => c.id === active.id);
      const prevOrder = cardIndex > 0 ? colWithCard.cards[cardIndex - 1].order : null;
      const nextOrder = cardIndex < colWithCard.cards.length - 1 ? colWithCard.cards[cardIndex + 1].order : null;
      const newOrder = generateKeyBetween(prevOrder, nextOrder);

      const updatedColumns = columns.map((c) => ({
        ...c,
        cards: c.cards.map((card) =>
          card.id === active.id ? { ...card, order: newOrder } : card
        ),
      }));
      setColumns(updatedColumns);

      await reorderCards(board.id, [
        { id: active.id as string, columnId: colWithCard.id, order: newOrder },
      ]);
    }
  }

  const memberList = board.members.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
  }));

  return (
    <div className="flex flex-col h-full -m-4 sm:-m-6">
      {/* Board Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-6 py-2 sm:py-3 bg-white border-b border-gray-200 shrink-0 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/boards"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSuperAdmin ? "cursor-pointer hover:opacity-80" : ""}`}
              style={{ backgroundColor: board.color || "#111827" }}
              onClick={() => isSuperAdmin && setShowColorPicker(!showColorPicker)}
              title={isSuperAdmin ? "Change board color" : undefined}
            >
              <Kanban size={18} className="text-white" />
            </div>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
                <div className="absolute left-0 top-11 z-20 bg-white rounded-lg border border-gray-200 shadow-xl p-3 w-[200px]">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Board Color</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {BOARD_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleColorChange(c)}
                        className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${(board.color || "#111827") === c ? "ring-2 ring-offset-1 ring-gray-900" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") { setEditTitle(board.title); setIsEditingTitle(false); }
                  }}
                  autoFocus
                  className="text-base sm:text-lg font-bold text-gray-900 bg-white border border-gray-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent min-w-0"
                />
                <button onClick={handleSaveTitle} className="p-1 rounded-lg hover:bg-green-50 text-green-600 transition-colors" title="Save">
                  <Check size={16} />
                </button>
                <button onClick={() => { setEditTitle(board.title); setIsEditingTitle(false); }} className="p-1 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Cancel">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group/title">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{board.title}</h1>
                {(!permissions || permissions.isFullAccess) && (
                  <button
                    onClick={() => { setEditTitle(board.title); setIsEditingTitle(true); }}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 opacity-0 group-hover/title:opacity-100 transition-all"
                    title="Edit board name"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            {!isEditingTitle && (
              <button
                onClick={() => setShowDesc(!showDesc)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-0.5"
                title={board.description || "No description"}
              >
                <FileText size={11} />
                <span className="truncate max-w-[200px] hidden sm:inline">
                  {board.description || "No description"}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0">
          <BoardFilter
            labels={board.labels}
            members={memberList}
            filter={filter}
            onChange={setFilter}
          />

          <div className="hidden sm:flex -space-x-2 ml-2">
            {board.members.slice(0, 4).map((m) => (
              <div
                key={m.user.id}
                title={m.user.displayName}
                className="h-8 w-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium ring-2 ring-white"
              >
                {m.user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            ))}
            {board.members.length > 4 && (
              <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium ring-2 ring-white">
                +{board.members.length - 4}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowActivity(!showActivity)}
            className={`p-2 rounded-lg transition-colors shrink-0 ${
              showActivity
                ? "bg-black text-white"
                : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            }`}
            title="Activity log"
          >
            <Activity size={18} />
          </button>
        </div>
      </div>

      {/* Board Description Panel */}
      {showDesc && (
        <div className="px-3 sm:px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0">
          <div className="flex items-start justify-between gap-3 max-w-2xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                {canEditBoardDesc && !isEditingDesc && (
                  <button
                    onClick={() => { setEditDesc(board.description || ""); setIsEditingDesc(true); }}
                    className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    placeholder="Add a board description..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDescription}
                      className="px-3 py-1.5 bg-black text-white text-xs rounded-lg hover:bg-gray-800"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditDesc(board.description || ""); setIsEditingDesc(false); }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {board.description || "No description yet."}
                </p>
              )}
            </div>
            <button
              onClick={() => { setShowDesc(false); setIsEditingDesc(false); }}
              className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 sm:p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            <SortableContext
              items={filteredColumns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {filteredColumns.map((column) => {
                const isRestricted = restrictedColumnIds.has(column.id);
                return (
                  <Column
                    key={column.id}
                    column={column}
                    boardId={board.id}
                    labels={board.labels}
                    isEditor={isRestricted ? false : isEditor}
                    canCreateCard={isRestricted ? false : canCreateCard}
                    canMoveCard={isRestricted ? false : canMoveCard}
                    canEditColumn={isRestricted ? false : canEditColumn}
                    canDeleteColumn={isRestricted ? false : canDeleteColumn}
                    restricted={isRestricted}
                    onCardClick={isRestricted ? undefined : setSelectedCardId}
                  />
                );
              })}
            </SortableContext>

            {canAddColumn && (
              <AddColumn
                boardId={board.id}
                lastOrder={columns.length > 0 ? columns[columns.length - 1].order : null}
              />
            )}
          </div>

          <DragOverlay>
            {activeCard && (
              <CardThumb card={activeCard} isDragOverlay onCardClick={() => {}} />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={board.id}
          labels={board.labels}
          columns={board.columns.map((c) => ({ id: c.id, title: c.title }))}
          members={board.members.map((m) => m.user)}
          allUsers={allUsers}
          isEditor={isEditor}
          permissions={permissions}
          onClose={() => setSelectedCardId(null)}
        />
      )}

      {/* Activity Panel */}
      <ActivityPanel
        boardId={board.id}
        isOpen={showActivity}
        onClose={() => setShowActivity(false)}
      />
    </div>
  );
}
