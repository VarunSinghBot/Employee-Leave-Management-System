import { useState, type FormEvent } from "react";
import { AlertTriangle, CalendarDays, Info, Send } from "lucide-react";
import {
  CONSECUTIVE_DAYS_LIMIT,
  DATE_REGEX,
  LEAVE_POLICY,
  LEAVE_TYPES,
  countLeaveDays,
  leaveRequestSchema,
  requiresHodApproval,
  todayKey,
  type LeaveRequestInput,
  type LeaveType,
} from "@elms/shared";
import { useAuth, useAppSelector } from "../../store";
import { Button } from "../ui/Button";
import { Input, Select, Textarea } from "../ui/Field";
import { FileDropzone } from "../ui/FileDropzone";
import { getFieldErrors, validateWith, type FieldErrors } from "../../utils/format.util";
import { notify } from "../../UI/Toast";

interface LeaveFormProps {
  initial?: LeaveRequestInput;
  existingDocuments?: number;
  submitLabel: string;
  onSubmit: (input: LeaveRequestInput, files: File[]) => Promise<void>;
}

const EMPTY: LeaveRequestInput = { type: LEAVE_TYPES.CASUAL, fromDate: "", toDate: "", reason: "" };

export function LeaveForm({ initial = EMPTY, existingDocuments = 0, submitLabel, onSubmit }: LeaveFormProps) {
  const { user } = useAuth();
  const balance = useAppSelector((s) => s.leave.balance);
  const [values, setValues] = useState<LeaveRequestInput>(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const validRange = DATE_REGEX.test(values.fromDate) && DATE_REGEX.test(values.toDate) && values.toDate >= values.fromDate;
  const days = validRange ? countLeaveDays(values.fromDate, values.toDate) : 0;
  const needsHod = validRange && requiresHodApproval(values.fromDate, values.toDate);
  const typeBalance = balance?.items.find((i) => i.type === values.type);

  const set = <K extends keyof LeaveRequestInput>(key: K, value: LeaveRequestInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const { data, errors: clientErrors } = validateWith(leaveRequestSchema, values);
    if (needsHod && files.length + existingDocuments === 0) {
      clientErrors.documents = `Leaves longer than ${CONSECUTIVE_DAYS_LIMIT} days need a supporting document`;
    }
    if (!data || Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      notify.warning("Please fix the highlighted fields", Object.values(clientErrors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(data, files);
    } catch (error) {
      setErrors(getFieldErrors(error));
      notify.apiError(error, "Could not save your request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Employee name" value={user?.name ?? ""} disabled hint="Taken from your profile" />
        <Select label="Leave type" value={values.type} onChange={(e) => set("type", e.target.value as LeaveType)} error={errors.type}>
          {Object.values(LEAVE_TYPES).map((t) => (
            <option key={t} value={t}>
              {LEAVE_POLICY[t].label} — {LEAVE_POLICY[t].description}
            </option>
          ))}
        </Select>
        <Input
          label="From date"
          type="date"
          min={todayKey()}
          value={values.fromDate}
          onChange={(e) => set("fromDate", e.target.value)}
          error={errors.fromDate}
        />
        <Input
          label="To date"
          type="date"
          min={values.fromDate || todayKey()}
          value={values.toDate}
          onChange={(e) => set("toDate", e.target.value)}
          error={errors.toDate}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600">
          <CalendarDays className="size-3.5" /> {days ? `${days} day${days > 1 ? "s" : ""}` : "Select dates"}
        </span>
        {typeBalance && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-violet-700">
            <Info className="size-3.5" />
            {typeBalance.remainingYear === null
              ? "No yearly limit for this type"
              : `${typeBalance.remainingYear} day(s) left this year`}
            {typeBalance.monthlyQuota !== null && ` · max ${typeBalance.monthlyQuota}/month`}
          </span>
        )}
      </div>

      {needsHod && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            This request is longer than <b>{CONSECUTIVE_DAYS_LIMIT} consecutive days</b>. Please attach a supporting document —
            it will need approval from your <b>manager</b> and then the <b>Head of Department</b>.
          </p>
        </div>
      )}

      <Textarea
        label="Reason"
        placeholder="e.g. Family vacation, medical appointment..."
        value={values.reason}
        maxLength={500}
        onChange={(e) => set("reason", e.target.value)}
        error={errors.reason}
        hint={`${values.reason.length}/500`}
      />

      <FileDropzone files={files} onChange={setFiles} error={errors.documents} required={needsHod} existingCount={existingDocuments} />

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} icon={<Send className="size-4" />}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
