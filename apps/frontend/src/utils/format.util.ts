import { isAxiosError } from "axios";
import type { ZodType } from "zod";
import type { ApiFailure } from "@elms/shared";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export const formatDate = (value: string) => dateFmt.format(new Date(value));
export const formatDateTime = (value: string) => dateTimeFmt.format(new Date(value));
export const formatRange = (from: string, to: string) =>
  from.slice(0, 10) === to.slice(0, 10) ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Friendly message from any API / network error
export const getErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again") => {
  if (isAxiosError<ApiFailure>(error)) {
    if (!error.response) return "Cannot reach the server. Check that the backend is running";
    return error.response.data?.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export type FieldErrors = Record<string, string>;

export const getFieldErrors = (error: unknown): FieldErrors => {
  if (!isAxiosError<ApiFailure>(error)) return {};
  return Object.fromEntries((error.response?.data?.errors ?? []).map((e) => [e.field, e.message]));
};

// Runs a shared zod schema on the client so forms show the same messages as the API
export const validateWith = <T>(schema: ZodType<T>, data: unknown): { data?: T; errors: FieldErrors } => {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    errors[key] ??= issue.message;
  }
  return { errors };
};

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
