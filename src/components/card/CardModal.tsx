"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Calendar,
  Tag,
  Users,
  Trash2,
  Check,
  Plus,
  Pencil,
  Lock,
  Unlock,
  ShieldAlert,
  Columns,
  Maximize2,
  Copy,
  ArrowRightLeft,
  Link2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import CardSubtasks from "./CardSubtasks";
import CardDependencies from "./CardDependencies";
import CardComments from "./CardComments";
import CardAttachments from "./CardAttachments";
import CrossBoardDialog from "./CrossBoardDialog";
import RichTextEditor, { RichTextReadonly } from "@/components/ui/RichTextEditor";
import {
  getCardById,
  updateCard,
  deleteCard,
  moveCard,
  toggleCardLabel,
  toggleCardAssignee,
  updateCardLockedFields,
} from "@/actions/card";
import { createLabel, updateLabel, deleteLabel } from "@/actions/label";
import { format } from "date-fns";
import { generateKeyBetween } from "fractional-indexing";
import { useRouter } from "next/navigation";
import type { UserBoardPermissions } from "@/lib/permissions";

const LABEL_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#6b7280", "#1e293b",
];

const LOCKABLE_FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "priority", label: "Priority" },
  { key: "dueDate", label: "Due Date" },
  { key: "labels", label: "Labels" },
  { key: "assignees", label: "Assignees" },
  { key: "subtasks", label: "Subtasks" },
  { key: "attachments", label: "Attachments" },
  { key: "dependencies", label: "Dependencies" },
  { key: "comments", label: "Comments" },
  { key: "delete", label: "Delete" },
  { key: "move", label: "Move" },
];

interface CardModalProps {
  cardId: string;
  boardId: string;
  labels: { id: string; name: string; color: string }[];
  columns: { id: string; title: string }[];
  members: { id: string; displayName: string; username: string; avatar: string | null }[];
  allUsers: { id: string; displayName: string; username: string; avatar: string | null }[];
  isEditor: boolean;
  permissions?: UserBoardPermissions;
  onClose: () => void;
}

type CardDetail = NonNullable<Awaited<ReturnType<typeof getCardById>>>;

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default function CardModal({
  cardId: initialCardId,
  boardId,
  labels,
  columns,
  members,
  allUsers,
  isEditor,
  permissions,
  onClose,
}: CardModalProps) {
  const router = useRouter();
  const [cardId, setCardId] = useState(initialCardId);
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const [showLabels, setShowLabels] = useState(false);
  const [showAssignees, setShowAssignees] = useState(false);
  const [showDescModal, setShowDescModal] = useState(false);
  const [crossBoardAction, setCrossBoardAction] = useState<"duplicate" | "move" | "refer" | null>(null);

  const [boardLabels, setBoardLabels] = useState(labels);

  useEffect(() => {
    setBoardLabels(labels);
  }, [labels]);
  const [labelMode, setLabelMode] = useState<"list" | "create" | "edit">("list");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);

  const [lockedFields, setLockedFields] = useState<string[]>([]);
  const [showLockPanel, setShowLockPanel] = useState(false);

  const full = !permissions || permissions.isFullAccess;
  const pCanLockCard = full || permissions?.canLockCard;

  function isLocked(field: string) {
    return lockedFields.includes(field);
  }

  function effectivePerm(basePerm: boolean | undefined, field: string) {
    if (pCanLockCard) return basePerm;
    if (isLocked(field)) return false;
    return basePerm;
  }

  const pCanEditTitle = effectivePerm(full || permissions?.canEditCardTitle, "title");
  const pCanEditDesc = effectivePerm(full || permissions?.canEditCardDescription, "description");
  const pCanEditPriority = effectivePerm(full || permissions?.canEditCardPriority, "priority");
  const pCanEditDueDate = effectivePerm(full || permissions?.canEditCardDueDate, "dueDate");
  const pCanEditLabels = effectivePerm(full || permissions?.canEditCardLabels, "labels");
  const pCanManageLabels = effectivePerm(full || permissions?.canManageLabels, "labels");
  const pCanEditAssignees = effectivePerm(full || permissions?.canEditCardAssignees, "assignees");
  const pCanManageSubtasks = effectivePerm(full || permissions?.canManageSubtasks, "subtasks");
  const pCanUploadAttachment = effectivePerm(full || permissions?.canUploadAttachment, "attachments");
  const pCanAddDependency = effectivePerm(full || permissions?.canAddDependency, "dependencies");
  const pCanComment = effectivePerm(full || permissions?.canComment, "comments");
  const pCanDeleteCard = effectivePerm(full || permissions?.canDeleteCard, "delete");
  const pCanMoveCard = effectivePerm(full || permissions?.canMoveCard, "move");

  useEffect(() => {
    loadCard();
  }, [cardId]);

  async function loadCard() {
    // #region agent log
    const _lcStart = Date.now(); console.log('[DBG-3e7644] loadCard START', {cardId, ts: _lcStart});
    // #endregion
    setLoading(true);
    const data = await getCardById(cardId);
    if (data) {
      setCard(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setPriority(data.priority);
      setDueDate(data.dueDate ? format(new Date(data.dueDate), "yyyy-MM-dd") : "");
      const lf = data.lockedFields;
      const parsed = typeof lf === "string" ? JSON.parse(lf) : lf;
      setLockedFields(Array.isArray(parsed) ? parsed : []);
    }
    setLoading(false);
    // #region agent log
    console.log('[DBG-3e7644] loadCard END', {cardId, elapsed: Date.now()-_lcStart});
    // #endregion
  }

  function refreshBoard() {
    // #region agent log
    console.log('[DBG-3e7644] refreshBoard called', {cardId, ts: Date.now()});
    // #endregion
    startTransition(() => router.refresh());
  }

  async function handleSave() {
    // #region agent log
    console.log('[DBG-3e7644] handleSave called', {cardId, ts: Date.now()});
    // #endregion
    const formData = new FormData();
    formData.set("id", cardId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("priority", priority);
    formData.set("dueDate", dueDate || "");
    await updateCard(formData);
  }

  async function handleFieldSave(field: string, value: string) {
    const formData = new FormData();
    formData.set("id", cardId);
    formData.set(field, value);
    await updateCard(formData);
  }

  async function handleDelete() {
    if (!confirm("Delete this card permanently?")) return;
    await deleteCard(cardId);
    onClose();
  }

  async function handleStageChange(targetColumnId: string) {
    if (!card || targetColumnId === card.columnId) return;
    const targetCol = columns.find((c) => c.id === targetColumnId);
    startTransition(async () => {
      const order = generateKeyBetween(null, null) + Date.now().toString(36);
      await moveCard(cardId, targetColumnId, order, boardId);
      setCard((prev) => prev ? { ...prev, columnId: targetColumnId, column: { ...prev.column, id: targetColumnId, title: targetCol?.title || prev.column.title } } : prev);
    });
  }

  async function handleToggleLabel(labelId: string) {
    startTransition(async () => {
      await toggleCardLabel(cardId, labelId, boardId);
      setCard((prev) => {
        if (!prev) return prev;
        const has = prev.labels.some((l) => l.label.id === labelId);
        if (has) {
          return { ...prev, labels: prev.labels.filter((l) => l.label.id !== labelId) };
        }
        const label = boardLabels.find((l) => l.id === labelId);
        if (!label) return prev;
        return { ...prev, labels: [...prev.labels, { label, labelId, cardId }] as typeof prev.labels };
      });
    });
  }

  async function handleToggleAssignee(userId: string) {
    startTransition(async () => {
      await toggleCardAssignee(cardId, userId, boardId);
      setCard((prev) => {
        if (!prev) return prev;
        const has = prev.assignees.some((a) => a.user.id === userId);
        if (has) {
          return { ...prev, assignees: prev.assignees.filter((a) => a.user.id !== userId) };
        }
        const user = allUsers.find((u) => u.id === userId);
        if (!user) return prev;
        return { ...prev, assignees: [...prev.assignees, { user, userId, cardId }] as typeof prev.assignees };
      });
    });
  }

  function openCreateLabel() {
    setLabelName("");
    setLabelColor(LABEL_COLORS[0]);
    setEditingLabelId(null);
    setLabelMode("create");
  }

  function openEditLabel(label: { id: string; name: string; color: string }) {
    setLabelName(label.name);
    setLabelColor(label.color);
    setEditingLabelId(label.id);
    setLabelMode("edit");
  }

  async function handleSaveLabel() {
    if (!labelName.trim()) return;
    startTransition(async () => {
      if (labelMode === "create") {
        const result = await createLabel(boardId, labelName, labelColor);
        if (result.error) { alert(result.error); return; }
        if (result.label) {
          setBoardLabels((prev) => [...prev, result.label!]);
        }
      } else if (editingLabelId) {
        const result = await updateLabel(editingLabelId, labelName, labelColor, boardId);
        if (result.error) { alert(result.error); return; }
        setBoardLabels((prev) =>
          prev.map((l) => l.id === editingLabelId ? { ...l, name: labelName.trim(), color: labelColor } : l)
        );
        setCard((prev) => {
          if (!prev) return prev;
          return { ...prev, labels: prev.labels.map((cl) => cl.label.id === editingLabelId ? { ...cl, label: { ...cl.label, name: labelName.trim(), color: labelColor } } : cl) };
        });
      }
      setLabelMode("list");
    });
  }

  async function handleDeleteLabel(labelId: string) {
    if (!confirm("Delete this label? It will be removed from all cards.")) return;
    startTransition(async () => {
      await deleteLabel(labelId, boardId);
      setBoardLabels((prev) => prev.filter((l) => l.id !== labelId));
      setCard((prev) => {
        if (!prev) return prev;
        return { ...prev, labels: prev.labels.filter((cl) => cl.label.id !== labelId) };
      });
    });
  }

  function handleNavigateToCard(newCardId: string) {
    setCardId(newCardId);
  }

  async function handleToggleLock(field: string) {
    const next = lockedFields.includes(field)
      ? lockedFields.filter((f) => f !== field)
      : [...lockedFields, field];
    setLockedFields(next);
    await updateCardLockedFields(cardId, next, boardId);
  }

  const assigneeIds = new Set(card?.assignees.map((a) => a.user.id) || []);
  const cardLabelIds = new Set(card?.labels.map((l) => l.label.id) || []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-[5vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-3xl sm:mx-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 sm:hidden" />
        {/* Header */}
        <div className="flex items-start justify-between px-4 sm:px-6 pt-3 sm:pt-5 pb-3 shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            {loading ? (
              <div className="h-7 w-48 bg-gray-100 rounded animate-pulse" />
            ) : pCanEditTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className="text-lg font-semibold text-gray-900 w-full border-0 border-b-2 border-transparent focus:border-black focus:outline-none px-0 py-0"
              />
            ) : (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            )}
            {card && (
              <p className="text-xs text-gray-400 mt-1">
                in <span className="font-medium text-gray-600">{card.column.title}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-6">
          {loading ? (
            <div className="space-y-4 pt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : card ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-2">
              {/* Main Content (2/3) */}
              <div className="sm:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDescModal(true)}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Expand description"
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                  {pCanEditDesc ? (
                    <RichTextEditor
                      content={description}
                      onChange={setDescription}
                      onBlur={handleSave}
                      placeholder="Add a description..."
                    />
                  ) : (
                    <RichTextReadonly content={description || "No description"} />
                  )}
                </div>

                {/* Description Fullscreen Modal */}
                {showDescModal && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
                    <div
                      className="absolute inset-0 bg-black/50"
                      onClick={() => { handleSave(); setShowDescModal(false); }}
                    />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                        <h3 className="text-base font-semibold text-gray-800">
                          Description — {title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => { handleSave(); setShowDescModal(false); }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-5">
                        {pCanEditDesc ? (
                          <RichTextEditor
                            content={description}
                            onChange={setDescription}
                            onBlur={handleSave}
                            placeholder="Add a description..."
                            minHeight="400px"
                          />
                        ) : (
                          <RichTextReadonly content={description || "No description"} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Labels Display */}
                {card.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {card.labels.map((cl) => (
                      <span
                        key={cl.label.id}
                        className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: cl.label.color }}
                      >
                        {cl.label.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Subtasks / Checklist */}
                <CardSubtasks
                  subtasks={card.subtasks}
                  cardId={cardId}
                  boardId={boardId}
                  isEditor={!!pCanManageSubtasks}
                  onUpdate={(subtasks) => setCard((prev) => prev ? { ...prev, subtasks } as typeof prev : prev)}
                />

                {/* Attachments */}
                <CardAttachments
                  attachments={card.attachments}
                  cardId={cardId}
                  boardId={boardId}
                  isEditor={!!pCanUploadAttachment}
                  onUpdate={(attachments) => setCard((prev) => prev ? { ...prev, attachments } as typeof prev : prev)}
                />

                {/* Comments with @Mentions */}
                <CardComments
                  comments={card.comments}
                  cardId={cardId}
                  boardId={boardId}
                  isEditor={!!pCanComment}
                  allUsers={allUsers}
                  onUpdate={(comments) => setCard((prev) => prev ? { ...prev, comments } as typeof prev : prev)}
                />
              </div>

              {/* Sidebar (1/3) */}
              <div className="space-y-5">
                {/* Stage (Column) */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 block">
                    <Columns size={12} /> Stage
                  </label>
                  {pCanMoveCard ? (
                    <select
                      value={card?.columnId || ""}
                      onChange={(e) => handleStageChange(e.target.value)}
                      disabled={isPending}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50"
                    >
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {columns.find((c) => c.id === card?.columnId)?.title || "—"}
                    </p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Priority
                  </label>
                  {pCanEditPriority ? (
                    <select
                      value={priority}
                      onChange={(e) => {
                        setPriority(e.target.value);
                        handleFieldSave("priority", e.target.value);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {priorityOptions.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant={priority === "URGENT" ? "danger" : priority === "HIGH" ? "warning" : "default"}>
                      {priority}
                    </Badge>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 block">
                    <Calendar size={12} /> Due Date
                  </label>
                  {pCanEditDueDate ? (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value);
                        handleFieldSave("dueDate", e.target.value);
                      }}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">
                      {dueDate ? format(new Date(dueDate), "MMM d, yyyy") : "None"}
                    </p>
                  )}
                </div>

                {/* Labels */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 block">
                    <Tag size={12} /> Labels
                  </label>
                  {pCanEditLabels && (
                    <button
                      onClick={() => { setShowLabels(!showLabels); setLabelMode("list"); }}
                      className="text-xs text-gray-500 hover:text-gray-700 mb-2"
                    >
                      {showLabels ? "Hide" : "Edit labels"}
                    </button>
                  )}
                  {showLabels && labelMode === "list" && (
                    <div className="space-y-1 mb-2">
                      {boardLabels.map((label) => (
                        <div key={label.id} className="flex items-center gap-1 group">
                          <button
                            onClick={() => handleToggleLabel(label.id)}
                            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left"
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                              style={{ backgroundColor: label.color }}
                            >
                              {cardLabelIds.has(label.id) && (
                                <Check size={10} className="text-white" />
                              )}
                            </div>
                            <span className="text-sm text-gray-700 truncate">{label.name}</span>
                          </button>
                          {pCanManageLabels && (
                            <button
                              onClick={() => openEditLabel(label)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 transition-all"
                            >
                              <Pencil size={10} />
                            </button>
                          )}
                          {pCanManageLabels && (
                            <button
                              onClick={() => handleDeleteLabel(label.id)}
                              className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      {pCanManageLabels && (
                        <button
                          onClick={openCreateLabel}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 mt-1"
                        >
                          <Plus size={12} /> Create new label
                        </button>
                      )}
                    </div>
                  )}
                  {showLabels && (labelMode === "create" || labelMode === "edit") && (
                    <div className="border border-gray-200 rounded-lg p-2.5 mb-2 space-y-2.5">
                      <p className="text-xs font-medium text-gray-600">
                        {labelMode === "create" ? "Create label" : "Edit label"}
                      </p>
                      <input
                        value={labelName}
                        onChange={(e) => setLabelName(e.target.value)}
                        placeholder="Label name"
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleSaveLabel()}
                      />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Color</p>
                        <div className="flex flex-wrap gap-1.5">
                          {LABEL_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setLabelColor(c)}
                              className={`w-6 h-6 rounded-md transition-all ${labelColor === c ? "ring-2 ring-offset-1 ring-gray-900 scale-110" : "hover:scale-110"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div
                        className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: labelColor }}
                      >
                        {labelName || "Preview"}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveLabel}
                          disabled={!labelName.trim() || isPending}
                          className="flex-1 px-2 py-1.5 bg-black text-white text-xs rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {labelMode === "create" ? "Create" : "Save"}
                        </button>
                        {labelMode === "edit" && editingLabelId && (
                          <button
                            onClick={() => handleDeleteLabel(editingLabelId)}
                            disabled={isPending}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                            title="Delete label"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => setLabelMode("list")}
                          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignees */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1 block">
                    <Users size={12} /> Assignees
                  </label>
                  {card.assignees.map((a) => (
                    <div key={a.user.id} className="flex items-center gap-2 py-1">
                      <Avatar name={a.user.displayName} src={a.user.avatar} size="sm" />
                      <span className="text-sm text-gray-700">{a.user.displayName}</span>
                    </div>
                  ))}
                  {pCanEditAssignees && (
                    <>
                      <button
                        onClick={() => setShowAssignees(!showAssignees)}
                        className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                      >
                        {showAssignees ? "Hide" : "Edit assignees"}
                      </button>
                      {showAssignees && (
                        <div className="space-y-1 mt-2 max-h-36 overflow-y-auto">
                          {allUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => handleToggleAssignee(u.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left"
                            >
                              <Avatar name={u.displayName} src={u.avatar} size="sm" />
                              <span className="text-sm text-gray-700 flex-1">{u.displayName}</span>
                              {assigneeIds.has(u.id) && (
                                <Check size={14} className="text-green-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Dependencies */}
                <CardDependencies
                  cardId={cardId}
                  boardId={boardId}
                  dependencies={card.dependencies}
                  dependedBy={card.dependedBy}
                  isEditor={!!pCanAddDependency}
                  onRefresh={loadCard}
                  onCardClick={handleNavigateToCard}
                />

                {/* Lock Panel */}
                {pCanLockCard && (
                  <div>
                    <button
                      onClick={() => setShowLockPanel(!showLockPanel)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 hover:text-gray-700"
                    >
                      <ShieldAlert size={12} />
                      Field Locks
                      {lockedFields.length > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full normal-case">
                          {lockedFields.length} locked
                        </span>
                      )}
                    </button>
                    {showLockPanel && (
                      <div className="space-y-1 border border-gray-200 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-400 mb-1">
                          Locked fields cannot be edited by users without lock permission.
                        </p>
                        {LOCKABLE_FIELDS.map((f) => {
                          const locked = isLocked(f.key);
                          return (
                            <button
                              key={f.key}
                              onClick={() => handleToggleLock(f.key)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                                locked
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "hover:bg-gray-50 text-gray-600 border border-transparent"
                              }`}
                            >
                              {locked ? <Lock size={12} className="shrink-0" /> : <Unlock size={12} className="shrink-0 text-gray-300" />}
                              <span className="flex-1">{f.label}</span>
                              {locked && <span className="text-[10px] text-amber-600">Locked</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Lock indicator for non-lock users */}
                {!pCanLockCard && lockedFields.length > 0 && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <Lock size={14} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-amber-800">Some fields are locked</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        {lockedFields.map((f) => LOCKABLE_FIELDS.find((lf) => lf.key === f)?.label).filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Card Actions: Duplicate / Move / Refer */}
                <div className="pt-4 border-t border-gray-100 space-y-1.5">
                  <button
                    onClick={() => setCrossBoardAction("duplicate")}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors w-full"
                  >
                    <Copy size={14} />
                    Duplicate card
                  </button>
                  {pCanMoveCard && (
                    <button
                      onClick={() => setCrossBoardAction("move")}
                      className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-800 transition-colors w-full"
                    >
                      <ArrowRightLeft size={14} />
                      Move to board
                    </button>
                  )}
                  <button
                    onClick={() => setCrossBoardAction("refer")}
                    className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition-colors w-full"
                  >
                    <Link2 size={14} />
                    Refer to board
                  </button>
                </div>

                {/* Delete */}
                {pCanDeleteCard && (
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete card
                    </button>
                  </div>
                )}
              </div>
            </div>

          ) : (
            <p className="text-center text-gray-400 py-8">Card not found</p>
          )}
        </div>
      </div>

      {/* CrossBoard Dialog */}
      {crossBoardAction && card && (
        <CrossBoardDialog
          cardId={cardId}
          cardTitle={title}
          currentBoardId={card.column.boardId}
          action={crossBoardAction}
          onClose={() => setCrossBoardAction(null)}
          onDone={() => {
            setCrossBoardAction(null);
            loadCard();
          }}
        />
      )}
    </div>
  );
}
