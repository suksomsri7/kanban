"use client";

import { useState, useRef, useTransition } from "react";
import { MessageSquare, Trash2, Send, Paperclip, X, Loader2, FileText, Film, Image as ImageIcon, Download, Bot } from "lucide-react";
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

interface PendingFile {
  file: File;
  preview: string | null;
}

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".avi"];

function getFileExt(url: string): string {
  const name = url.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.substring(dot).toLowerCase() : "";
}

function getFileName(url: string): string {
  const name = url.split("/").pop() || "file";
  const underscoreIdx = name.indexOf("_");
  return underscoreIdx > 0 ? name.substring(underscoreIdx + 1) : name;
}

function isImageUrl(url: string): boolean {
  return IMAGE_EXTS.some((ext) => getFileExt(url) === ext);
}

function isVideoUrl(url: string): boolean {
  return VIDEO_EXTS.some((ext) => getFileExt(url) === ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileTypeInfo(file: File): { icon: "image" | "video" | "doc"; label: string } {
  if (file.type.startsWith("image/")) return { icon: "image", label: "Image" };
  if (file.type.startsWith("video/")) return { icon: "video", label: "Video" };
  return { icon: "doc", label: file.name.split(".").pop()?.toUpperCase() || "File" };
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newFiles: PendingFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      newFiles.push({ file, preview });
    }
    setPendingFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => {
      if (prev[index].preview) URL.revokeObjectURL(prev[index].preview!);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadFiles(): Promise<{ url: string; name: string; mime: string }[]> {
    const results: { url: string; name: string; mime: string }[] = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const pf = pendingFiles[i];
      setUploadProgress(`Uploading ${i + 1}/${pendingFiles.length}: ${pf.file.name}`);
      const formData = new FormData();
      formData.set("file", pf.file);
      formData.set("cardId", cardId);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.fileUrl) {
        results.push({ url: data.fileUrl, name: data.fileName, mime: data.mimeType || "" });
      }
    }
    setUploadProgress("");
    return results;
  }

  async function handleSubmit() {
    if (!text.trim() && pendingFiles.length === 0) return;
    setUploading(true);

    try {
      let finalContent = text;

      if (pendingFiles.length > 0) {
        const uploaded = await uploadFiles();
        const attachLines = uploaded.map((f) => {
          if (f.mime.startsWith("image/")) return `![${f.name}](${f.url})`;
          if (f.mime.startsWith("video/")) return `[video:${f.name}](${f.url})`;
          return `[file:${f.name}](${f.url})`;
        });
        const attachMarkdown = attachLines.join("\n");
        finalContent = finalContent.trim()
          ? `${finalContent.trim()}\n${attachMarkdown}`
          : attachMarkdown;
      }

      if (!finalContent.trim()) return;

      startTransition(async () => {
        await addComment(cardId, finalContent, boardId);
        setText("");
        pendingFiles.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
        setPendingFiles([]);
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

    const attachRegex = /!\[([^\]]*)\]\(([^)]+)\)|\[(?:video|file):([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = attachRegex.exec(normalized)) !== null) {
      if (match.index > lastIndex) {
        segments.push(...renderTextSegment(normalized.substring(lastIndex, match.index), key));
        key += 100;
      }

      if (match[0].startsWith("![")) {
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
      } else if (match[0].startsWith("[video:")) {
        const url = match[4];
        const name = match[3] || getFileName(url);
        segments.push(
          <div key={`vid-${key++}`} className="my-1.5">
            <video
              src={url}
              controls
              preload="metadata"
              className="max-w-full max-h-60 rounded-lg border border-gray-200"
            />
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
              <Film size={10} /> {name}
            </p>
          </div>
        );
      } else if (match[0].startsWith("[file:")) {
        const url = match[4];
        const name = match[3] || getFileName(url);
        const ext = getFileExt(url);
        segments.push(
          <a
            key={`file-${key++}`}
            href={url}
            download={name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 my-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FileText size={16} className="text-gray-500 shrink-0" />
            <span className="text-xs text-gray-700 font-medium truncate max-w-[200px]">{name}</span>
            <span className="text-[10px] text-gray-400 uppercase shrink-0">{ext.replace(".", "")}</span>
            <Download size={12} className="text-gray-400 shrink-0" />
          </a>
        );
      }

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

  const FileIcon = ({ type }: { type: "image" | "video" | "doc" }) => {
    if (type === "image") return <ImageIcon size={14} className="text-blue-500" />;
    if (type === "video") return <Film size={14} className="text-purple-500" />;
    return <FileText size={14} className="text-gray-500" />;
  };

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
                    setPendingFiles((prev) => [
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
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Attach file"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 transition-colors"
            >
              <Paperclip size={16} />
            </button>
            <button
              onClick={handleSubmit}
              disabled={(!text.trim() && pendingFiles.length === 0) || isPending || uploading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-black disabled:opacity-30 transition-colors"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {pendingFiles.map((pf, idx) => {
                const info = getFileTypeInfo(pf.file);
                return (
                  <div key={idx} className="relative group">
                    {pf.preview ? (
                      <img
                        src={pf.preview}
                        alt="preview"
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-0.5">
                        <FileIcon type={info.icon} />
                        <span className="text-[8px] text-gray-400 font-medium uppercase">{info.label}</span>
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 text-[7px] text-center text-gray-500 bg-white/80 rounded-b-lg px-0.5 truncate">
                      {formatSize(pf.file.size)}
                    </span>
                    <button
                      onClick={() => removePendingFile(idx)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {uploadProgress && (
            <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> {uploadProgress}
            </p>
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
        {comments.map((comment) => {
          const agentMatch = comment.content.match(/^\*\*\[Agent:\s*(.+?)\]\*\*\n?/);
          const agentName = agentMatch ? agentMatch[1] : null;
          const displayContent = agentMatch ? comment.content.slice(agentMatch[0].length) : comment.content;

          return (
            <div key={comment.id} className="flex gap-2.5 group">
              {agentName ? (
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-teal-600" />
                </div>
              ) : (
                <Avatar
                  name={comment.author.displayName}
                  src={comment.author.avatar}
                  size="sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {agentName ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-teal-700">
                      {agentName}
                      <span className="text-[9px] px-1.5 py-0.5 bg-teal-100 text-teal-600 rounded-full font-medium">Agent</span>
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {comment.author.displayName}
                    </span>
                  )}
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
                  {renderContent(displayContent)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
