"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { MessageSquare, Trash2, Send } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { addComment, deleteComment } from "@/actions/card";
import { format } from "date-fns";

interface Comment {
  id: string;
  content: string;
  createdAt: Date | string;
  author: { id: string; displayName: string; avatar: string | null };
}

interface MentionUser {
  id: string;
  displayName: string;
  username: string;
  avatar: string | null;
}

interface CardCommentsProps {
  comments: Comment[];
  cardId: string;
  boardId: string;
  isEditor: boolean;
  allUsers: MentionUser[];
  onRefresh: () => void;
}

export default function CardComments({
  comments,
  cardId,
  boardId,
  isEditor,
  allUsers,
  onRefresh,
}: CardCommentsProps) {
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = allUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(mentionSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const pos = e.target.selectionStart;
    setText(value);
    setCursorPos(pos);

    const beforeCursor = value.substring(0, pos);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionSearch(mentionMatch[1]);
    } else {
      setShowMentions(false);
    }
  }

  function insertMention(user: MentionUser) {
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);
    const mentionStart = beforeCursor.lastIndexOf("@");
    const newText =
      beforeCursor.substring(0, mentionStart) +
      `@${user.username} ` +
      afterCursor;
    setText(newText);
    setShowMentions(false);
    textRef.current?.focus();
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await addComment(cardId, text, boardId);
      setText("");
      onRefresh();
    });
  }

  async function handleDelete(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId, boardId);
      onRefresh();
    });
  }

  function renderContent(content: string) {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        const user = allUsers.find((u) => u.username === username);
        return (
          <span
            key={i}
            className="text-blue-600 font-medium bg-blue-50 rounded px-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
        <MessageSquare size={14} />
        Comments ({comments.length})
      </h4>

      {isEditor && (
        <div className="relative mb-4">
          <textarea
            ref={textRef}
            value={text}
            onChange={handleTextChange}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none pr-10"
            placeholder="Write a comment... Use @ to mention"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isPending}
            className="absolute right-2 bottom-2 p-1.5 rounded-lg text-gray-400 hover:text-black disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>

          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute left-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg w-56 max-h-40 overflow-y-auto z-10">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => insertMention(u)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                >
                  <Avatar name={u.displayName} src={u.avatar} size="sm" />
                  <div>
                    <p className="text-gray-900 text-sm">{u.displayName}</p>
                    <p className="text-gray-400 text-xs">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2.5 group">
            <Avatar
              name={comment.author.displayName}
              src={comment.author.avatar}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {comment.author.displayName}
                </span>
                <span className="text-xs text-gray-400">
                  {format(new Date(comment.createdAt), "MMM d, HH:mm")}
                </span>
                {isEditor && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all ml-auto"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">
                {renderContent(comment.content)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
