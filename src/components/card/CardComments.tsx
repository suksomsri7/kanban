"use client";

import { useState, useRef, useTransition } from "react";
import { MessageSquare, Trash2, Send, ImagePlus, X, Loader2 } from "lucide-react";
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

interface PendingImage {
  file: File;
  preview: string;
}

const IMAGE_URL_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const BARE_IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpe?g|gif|webp))(?:\s|$)/gi;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);

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

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newImages: PendingImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds 10MB limit`);
        continue;
      }
      newImages.push({ file, preview: URL.createObjectURL(file) });
    }
    setPendingImages((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingImage(index: number) {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of pendingImages) {
      const formData = new FormData();
      formData.set("file", img.file);
      formData.set("cardId", cardId);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.fileUrl) urls.push(data.fileUrl);
    }
    return urls;
  }

  async function handleSubmit() {
    if (!text.trim() && pendingImages.length === 0) return;
    setUploading(true);

    try {
      let finalContent = text;

      if (pendingImages.length > 0) {
        const urls = await uploadImages();
        const imageMarkdown = urls.map((url) => `![image](${url})`).join("\n");
        finalContent = finalContent.trim()
          ? `${finalContent.trim()}\n${imageMarkdown}`
          : imageMarkdown;
      }

      if (!finalContent.trim()) return;

      startTransition(async () => {
        await addComment(cardId, finalContent, boardId);
        setText("");
        pendingImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setPendingImages([]);
        onRefresh();
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(commentId: string) {
    startTransition(async () => {
      await deleteComment(commentId, boardId);
      onRefresh();
    });
  }

  function renderContent(content: string) {
    const normalized = content.replace(/\\n/g, "\n");

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;

    const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = mdRegex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        segments.push(...renderTextSegment(normalized.substring(lastIndex, match.index), key));
        key += 100;
      }
      const url = match[2];
      segments.push(
        <a key={`img-${key++}`} href={url} target="_blank" rel="noopener noreferrer" className="block my-1.5">
          <img
            src={url}
            alt={match[1] || "image"}
            className="max-w-full max-h-60 rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < normalized.length) {
      segments.push(...renderTextSegment(normalized.substring(lastIndex), key));
    }

    return segments;
  }

  function renderTextSegment(text: string, startKey: number): React.ReactNode[] {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={`m-${startKey}-${i}`}
            className="text-blue-600 font-medium bg-blue-50 rounded px-0.5"
          >
            {part}
          </span>
        );
      }
      return <span key={`t-${startKey}-${i}`}>{part}</span>;
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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none pr-20"
            placeholder="Write a comment... Use @ to mention"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image/")) {
                  e.preventDefault();
                  const file = items[i].getAsFile();
                  if (file) {
                    setPendingImages((prev) => [
                      ...prev,
                      { file, preview: URL.createObjectURL(file) },
                    ]);
                  }
                  break;
                }
              }
            }}
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Attach image"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
            >
              <ImagePlus size={16} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={(!text.trim() && pendingImages.length === 0) || isPending || uploading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-black disabled:opacity-30 transition-colors"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={img.preview}
                    alt="preview"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removePendingImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
              <div className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">
                {renderContent(comment.content)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
