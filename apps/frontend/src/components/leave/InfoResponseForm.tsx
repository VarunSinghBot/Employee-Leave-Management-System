import { useState } from "react";
import { Send } from "lucide-react";
import { infoResponseSchema, type LeaveDetail } from "@elms/shared";
import { leaveService } from "../../services/leave.service";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { Card, CardHeader } from "../ui/Card";
import { FileDropzone } from "../ui/FileDropzone";
import { getFieldErrors, validateWith } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

// Shown to the employee when a reviewer asked for more information
export function InfoResponseForm({ leave, onSent }: { leave: LeaveDetail; onSent: (leave: LeaveDetail) => void }) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const { data, errors } = validateWith(infoResponseSchema, { message });
    if (!data) return setError(errors.message);
    setBusy(true);
    try {
      const res = await leaveService.respond(leave.id, data.message, files);
      notify.success(res.message, "Your request is back in the review queue");
      onSent(res.data);
    } catch (err) {
      setError(getFieldErrors(err).message ?? "");
      notify.apiError(err, "Could not send your response");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-sky-200 glow-sky">
      <CardHeader title="More information requested" subtitle="Reply to your approver and attach documents if needed" />
      <div className="space-y-4 p-5">
        <Textarea
          label="Your response"
          value={message}
          maxLength={500}
          onChange={(e) => {
            setMessage(e.target.value);
            setError("");
          }}
          error={error}
        />
        <FileDropzone files={files} onChange={setFiles} existingCount={leave.documents.length} />
        <Button className="w-full" loading={busy} onClick={submit} icon={<Send className="size-4" />}>
          Send response
        </Button>
      </div>
    </Card>
  );
}
