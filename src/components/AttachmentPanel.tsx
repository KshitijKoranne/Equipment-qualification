"use client";
import { useState, useEffect, useRef } from "react";
import { Paperclip, Upload, X, Download, FileText, Image, File, Loader2 } from "lucide-react";

type Attachment = {
  id: number;
  qualification_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
};

function fileIcon(type: string) {
  if (type?.startsWith("image/")) return Image;
  if (type === "application/pdf" || type?.includes("word") || type?.includes("document")) return FileText;
  return File;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentPanel({ qualificationId }: { qualificationId: number }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/attachments/${qualificationId}`);
      setAttachments(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAttachments(); }, [qualificationId]);

  const uploadFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Max size is 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch("/api/attachments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qualification_id: qualificationId,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            file_data: base64,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error || "Upload failed");
        } else {
          await fetchAttachments();
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Upload failed");
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const surfaceStyle = { background: "var(--bg-surface-2)", border: "1px solid var(--border)" };

  return (
    <div style={{ borderTop: "1px solid var(--border-light)" }} className="px-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Paperclip size={13} style={{ color: "var(--text-muted)" }} />
          <span style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider">
            Attachments {attachments.length > 0 && `(${attachments.length})`}
          </span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)", background: "var(--bg-surface-2)" }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? "Uploading..." : "Add File"}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Drop zone — only visible when no attachments yet or always */}
      {attachments.length === 0 && !loading && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragOver ? "var(--focus-ring)" : "var(--border)"}`,
            background: dragOver ? "var(--bg-hover)" : "transparent",
            color: "var(--text-muted)",
          }}
          className="rounded-lg py-5 flex flex-col items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Upload size={18} style={{ color: "var(--text-subtle)" }} />
          <span className="text-xs">Drop file here or click to browse</span>
          <span className="text-xs" style={{ color: "var(--text-subtle)" }}>PDF, DOCX, XLSX, images — max 5 MB</span>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 size={14} style={{ color: "var(--text-muted)" }} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const Icon = fileIcon(att.file_type);
            return (
              <div key={att.id} style={surfaceStyle} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <Icon size={15} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p style={{ color: "var(--text-primary)" }} className="text-xs font-medium truncate">{att.file_name}</p>
                  <p style={{ color: "var(--text-muted)" }} className="text-[10px] mt-0.5">
                    {formatBytes(att.file_size)} · {new Date(att.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={`/api/attachments/download/${att.id}`} download={att.file_name}
                    style={{ color: "var(--text-muted)" }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:opacity-60 transition-opacity"
                    title="Download">
                    <Download size={13} />
                  </a>
                  <button onClick={() => handleDelete(att.id)}
                    style={{ color: "var(--badge-over-text)" }}
                    className="w-6 h-6 flex items-center justify-center rounded hover:opacity-60 transition-opacity"
                    title="Delete">
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {/* Drop zone when files already exist */}
          {attachments.length > 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `1.5px dashed ${dragOver ? "var(--focus-ring)" : "var(--border)"}`,
                background: dragOver ? "var(--bg-hover)" : "transparent",
                color: "var(--text-subtle)",
              }}
              className="rounded-lg py-2 flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity mt-2"
            >
              <Upload size={12} />
              <span className="text-xs">Add another file</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: "var(--badge-over-text)" }} className="text-xs mt-2">{error}</p>
      )}
    </div>
  );
}
