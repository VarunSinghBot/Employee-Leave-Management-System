import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../utils/format.util";

const control = (error?: string) =>
  cn(
    "w-full rounded-xl border bg-white px-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition",
    "focus:outline-none focus:ring-4",
    error
      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
      : "border-slate-200 focus:border-violet-400 focus:ring-violet-100",
  );

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, error, hint, children, className }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-slate-400">{hint}</span>
      )}
    </label>
  );
}

type WithField<T> = T & Omit<FieldProps, "children">;

export function Input({ label, error, hint, className, ...props }: WithField<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <input className={cn(control(error), "h-10")} aria-invalid={!!error} {...props} />
    </Field>
  );
}

// Password field with a show / hide toggle
export function PasswordInput({
  label,
  error,
  hint,
  className,
  ...props
}: WithField<Omit<InputHTMLAttributes<HTMLInputElement>, "type">>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <input type={visible ? "text" : "password"} className={cn(control(error), "h-10 pr-11")} aria-invalid={!!error} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-xl text-slate-400 transition hover:text-violet-600"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
        >
          <Icon className="size-4" />
        </button>
      </div>
    </Field>
  );
}

export function Select({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: WithField<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <select className={cn(control(error), "h-10 cursor-pointer pr-8")} aria-invalid={!!error} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, className, ...props }: WithField<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <textarea className={cn(control(error), "min-h-24 resize-y py-2.5")} aria-invalid={!!error} {...props} />
    </Field>
  );
}
