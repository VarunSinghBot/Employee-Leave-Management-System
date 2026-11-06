import { useRef, useState, type DragEvent } from "react";
import { FileText, Paperclip, UploadCloud, X } from "lucide-react";
import { DOCUMENT_RULES } from "@elms/shared";
import { cn, formatBytes } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

interface FileDropzoneProps {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
  required?: boolean;
  existingCount?: number;
}

const allowed: readonly string[] = DOCUMENT_RULES.allowedMimeTypes;

// Client-side checks mirror the server's multer limits for instant feedback
export function FileDropzone({ files, onChange, error, required, existingCount = 0 }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (!allowed.includes(file.type)) {
        notify.warning("File not supported", `${file.name} — use PDF, PNG, JPG or WEBP`);
        continue;
      }
      if (file.size > DOCUMENT_RULES.maxFileSizeMB * 1024 * 1024) {
        notify.warning("File too large", `${file.name} is over ${DOCUMENT_RULES.maxFileSizeMB} MB`);
        continue;
      }
      if (next.length + existingCount >= DOCUMENT_RULES.maxFiles) {
        notify.warning("Too many files", `You can attach up to ${DOCUMENT_RULES.maxFiles} documents`);
        break;
      }
      next.push(file);
    }
    onChange(next);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
        <Paperclip className="size-3.5" /> Supporting documents {required ? <span className="text-rose-500">*</span> : <span className="text-slate-400">(optional)</span>}
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition",
          dragging ? "border-violet-400 bg-violet-50" : error ? "border-rose-300 bg-rose-50/40" : "border-slate-200 bg-slate-50/60 hover:border-violet-300",
        )}
      >
        <UploadCloud className="size-6 text-violet-500" />
        <span className="mt-2 text-sm font-medium text-slate-700">Click to upload or drag & drop</span>
        <span className="mt-0.5 text-xs text-slate-400">
          PDF, PNG, JPG, WEBP · up to {DOCUMENT_RULES.maxFileSizeMB} MB each · max {DOCUMENT_RULES.maxFiles} files
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DOCUMENT_RULES.allowedExtensions}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <FileText className="size-4 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
              <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
