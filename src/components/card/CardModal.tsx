"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Calendar,
  Tag,
  Users,
  Trash2,
  Check,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import CardSubtasks from "./CardSubtasks";
import CardDependencies from "./CardDependencies";
import CardComments from "./CardComments";
import CardAttachments from "./CardAttachments";
import {
  getCardById,
  updateCard,
  deleteCard,
  toggleCardLabel,
  toggleCardAssignee,
} from "@/actions/card";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface CardModalProps {
  cardId: string;
  boardId: string;
  labels: { id: string; name: string; color: string }[];
  members: { id: string; displayName: string; username: string; avatar: string | null }[];
  allUsers: { id: string; displayName: string; username: string; avatar: string | null }[];
  isEditor: boolean;
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
  members,
  allUsers,
  isEditor,
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

  useEffect(() => {
    loadCard();
  }, [cardId]);

  async function loadCard() {
    setLoading(true);
    const data = await getCardById(cardId);
    if (data) {
      setCard(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setPriority(data.priority);
      setDueDate(data.dueDate ? format(new Date(data.dueDate), "yyyy-MM-dd") : "");
    }
    setLoading(false);
  }

  async function handleSave() {
    const formData = new FormData();
    formData.set("id", cardId);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("priority", priority);
    formData.set("dueDate", dueDate || "");
    await updateCard(formData);
    router.refresh();
  }

  async function handleFieldSave(field: string, value: string) {
    const formData = new FormData();
    formData.set("id", cardId);
    formData.set(field, value);
    await updateCard(formData);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this card permanently?")) return;
    // #region agent log
    console.log('[DEBUG-d14894] deleteCard called', { cardId });
    // #endregion
    const result = await deleteCard(cardId);
    // #region agent log
    console.log('[DEBUG-d14894] deleteCard result', result);
    // #endregion
    onClose();
    router.refresh();
    // #region agent log
    console.log('[DEBUG-d14894] router.refresh called after delete');
    // #endregion
  }

  async function handleToggleLabel(labelId: string) {
    startTransition(async () => {
      await toggleCardLabel(cardId, labelId, boardId);
      await loadCard();
    });
  }

  async function handleToggleAssignee(userId: string) {
    startTransition(async () => {
      await toggleCardAssignee(cardId, userId, boardId);
      await loadCard();
    });
  }

  function handleNavigateToCard(newCardId: string) {
    setCardId(newCardId);
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
            ) : isEditor ? (
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
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Description
                  </label>
                  {isEditor ? (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={handleSave}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                      placeholder="Add a description..."
                    />
                  ) : (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {description || "No description"}
                    </p>
                  )}
                </div>

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
                  isEditor={isEditor}
                  onRefresh={loadCard}
                />

                {/* Attachments */}
                <CardAttachments
                  attachments={card.attachments}
                  cardId={cardId}
                  boardId={boardId}
                  isEditor={isEditor}
                  onRefresh={loadCard}
                />

                {/* Comments with @Mentions */}
                <CardComments
                  comments={card.comments}
                  cardId={cardId}
                  boardId={boardId}
                  isEditor={isEditor}
                  allUsers={allUsers}
                  onRefresh={loadCard}
                />
              </div>

              {/* Sidebar (1/3) */}
              <div className="space-y-5">
                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Priority
                  </label>
                  {isEditor ? (
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
                  {isEditor ? (
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
                  {isEditor && (
                    <button
                      onClick={() => setShowLabels(!showLabels)}
                      className="text-xs text-gray-500 hover:text-gray-700 mb-2"
                    >
                      {showLabels ? "Hide" : "Edit labels"}
                    </button>
                  )}
                  {showLabels && (
                    <div className="space-y-1 mb-2">
                      {labels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => handleToggleLabel(label.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left"
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center"
                            style={{ backgroundColor: label.color }}
                          >
                            {cardLabelIds.has(label.id) && (
                              <Check size={10} className="text-white" />
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{label.name}</span>
                        </button>
                      ))}
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
                  {isEditor && (
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
                  isEditor={isEditor}
                  onRefresh={loadCard}
                  onCardClick={handleNavigateToCard}
                />

                {/* Delete */}
                {isEditor && (
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
    </div>
  );
}
