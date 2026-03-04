"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
import { ArrowLeft, Activity } from "lucide-react";
import Link from "next/link";
import Column from "@/components/column/Column";
import CardThumb from "@/components/card/CardThumb";
import AddColumn from "@/components/column/AddColumn";
import CardModal from "@/components/card/CardModal";
import ActivityPanel from "./ActivityPanel";
import BoardFilter, { emptyFilter, type FilterState } from "./BoardFilter";
import { reorderCards } from "@/actions/card";
import { reorderColumns } from "@/actions/column";
import type { SessionUser } from "@/types";
import { useBoardRealtime } from "@/hooks/useRealtime";

type BoardData = NonNullable<Awaited<ReturnType<typeof import("@/actions/board").getBoardById>>>;
type ColumnData = BoardData["columns"][number];
type CardData = ColumnData["cards"][number];
type UserOption = { id: string; displayName: string; username: string; avatar: string | null };

interface BoardViewProps {
  board: BoardData;
  currentUser: SessionUser;
  allUsers: UserOption[];
}

export default function BoardView({ board, currentUser, allUsers }: BoardViewProps) {
  useBoardRealtime(board.id);
  const [columns, setColumns] = useState(board.columns);

  useEffect(() => {
    setColumns(board.columns);
  }, [board.columns]);

  // #region agent log
  const boardCardCount = board.columns.reduce((s, c) => s + c.cards.length, 0);
  const stateCardCount = columns.reduce((s, c) => s + c.cards.length, 0);
  if (typeof window !== 'undefined') {
    console.log('[DEBUG-d14894] BoardView render', { boardPropCards: boardCardCount, stateCards: stateCardCount });
  }
  // #endregion
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);

  const isEditor = currentUser.role !== "GUEST";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const filteredColumns = useMemo(() => {
    if (!filter.search && !filter.assigneeId && !filter.labelId && !filter.priority) {
      return columns;
    }

    return columns.map((col) => ({
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
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{board.title}</h1>
            {board.description && (
              <p className="text-xs text-gray-500 truncate hidden sm:block">{board.description}</p>
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
              {filteredColumns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  boardId={board.id}
                  labels={board.labels}
                  isEditor={isEditor}
                  onCardClick={setSelectedCardId}
                />
              ))}
            </SortableContext>

            {isEditor && (
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
          members={board.members.map((m) => m.user)}
          allUsers={allUsers}
          isEditor={isEditor}
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
