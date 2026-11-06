import { useEffect, useState } from "react";
import { Download, Eye, FileImage, FileText } from "lucide-react";
import type { LeaveDocument } from "@elms/shared";
import { leaveService } from "../../services/leave.service";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Feedback";
import { formatBytes, formatDateTime } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

// Documents are fetched with the auth cookie as a blob, then previewed in a modal
export function DocumentList({ leaveId, documents }: { leaveId: string; documents: LeaveDocument[] }) {
  const [active, setActive] = useState<LeaveDocument | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const preview = async (doc: LeaveDocument) => {
    setActive(doc);
    setUrl(null);
    try {
      const blob = await leaveService.document(leaveId, doc.id);
      setUrl(URL.createObjectURL(blob));
    } catch (error) {
      setActive(null);
      notify.apiError(error, "Could not open the document");
    }
  };

  if (!documents.length) return <p className="text-sm text-slate-400">No documents attached.</p>;

  return (
    <>
      <ul className="space-y-2">
        {documents.map((doc) => {
          const Icon = doc.mimeType.startsWith("image/") ? FileImage : FileText;
          return (
            <li key={doc.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600">
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{doc.originalName}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(doc.size)} · {formatDateTime(doc.createdAt)}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => preview(doc)} icon={<Eye className="size-3.5" />}>
                View
              </Button>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!active}
        title={active?.originalName ?? "Document"}
        onClose={() => setActive(null)}
        size="lg"
        footer={
          url && (
            <a href={url} download={active?.originalName}>
              <Button variant="secondary" icon={<Download className="size-4" />}>Download</Button>
            </a>
          )
        }
      >
        {!url ? (
          <Spinner label="Loading document..." />
        ) : active?.mimeType.startsWith("image/") ? (
          <img src={url} alt={active.originalName} className="mx-auto max-h-[65vh] rounded-xl" />
        ) : (
          <iframe src={url} title={active?.originalName} className="h-[65vh] w-full rounded-xl border border-slate-200" />
        )}
      </Modal>
    </>
  );
}
