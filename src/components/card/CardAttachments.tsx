"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Paperclip, Upload, Trash2, FileText, Image, Film, File } from "lucide-react";
import { createAttachmentRecord, deleteAttachment } from "@/actions/attachment";
import { format } from "date-fns";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date | string;
  uploader: { id: string; displayName: string };
}

interface CardAttachmentsProps {
  attachments: Attachment[];
  cardId: string;
  boardId: string;
  isEditor: boolean;
  onUpdate?: (attachments: Attachment[]) => void;
  onRefresh?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <Image size={16} className="text-purple-500" />;
  if (mimeType.startsWith("video/")) return <Film size={16} className="text-blue-500" />;
  if (mimeType.includes("pdf")) return <FileText size={16} className="text-red-500" />;
  return <File size={16} className="text-gray-500" />;
}

export default function CardAttachments({
  attachments: initialAttachments,
  cardId,
  boardId,
  isEditor,
  onUpdate,
  onRefresh,
}: CardAttachmentsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setItems(initialAttachments); }, [initialAttachments]);

  function notify(next: Attachment[]) {
    if (onUpdate) onUpdate(next);
    else if (onRefresh) onRefresh();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cardId", cardId);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        const result = await createAttachmentRecord(
          cardId,
          data.fileName,
          data.fileUrl,
          data.fileSize,
          data.mimeType,
          boardId
        );
        if (result && "attachment" in result && result.attachment) {
          const next = [result.attachment as Attachment, ...items];
          setItems(next);
          notify(next);
        } else if (onRefresh) onRefresh();
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm("Delete this attachment?")) return;
    const next = items.filter((a) => a.id !== attachmentId);
    setItems(next);
    notify(next);
    startTransition(async () => {
      await deleteAttachment(attachmentId, boardId);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <Paperclip size={14} />
          Attachments ({items.length})
        </h4>
        {isEditor && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Upload size={12} />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        onChange={handleUpload}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
      />

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-gray-200 group"
            >
              {getFileIcon(att.mimeType)}
              <div className="flex-1 min-w-0">
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-700 hover:text-black truncate block"
                >
                  {att.fileName}
                </a>
                <p className="text-[10px] text-gray-400">
                  {formatFileSize(att.fileSize)} · {att.uploader.displayName} · {format(new Date(att.createdAt), "MMM d")}
                </p>
              </div>
              {isEditor && (
                <button
                  onClick={() => handleDelete(att.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
