import { z } from "zod";
import {
  CONSECUTIVE_DAYS_LIMIT,
  LEAVE_STATUS,
  LEAVE_TYPES,
  MAX_LEAVE_SPAN_DAYS,
  REVIEW_ACTIONS,
} from "./constants.js";
import { DATE_REGEX, countLeaveDays, todayKey } from "./date.js";

const enumValues = <T extends Record<string, string>>(obj: T) =>
  Object.values(obj) as [T[keyof T], ...T[keyof T][]];

const dateField = (label: string) =>
  z.string({ error: `${label} is required` }).regex(DATE_REGEX, `${label} must be a valid date (YYYY-MM-DD)`);

// ---------------------------------------------------------------- Auth
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long"),
  email: z.email("Please enter a valid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
  departmentId: z.string().min(1, "Please choose your department"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const managementAccountSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long"),
  email: z.email("Please enter a valid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/\d/, "Password must contain a number"),
  role: z.enum(["MANAGER", "HOD"], { error: "Please choose an account role" }),
});
export type ManagementAccountInput = z.infer<typeof managementAccountSchema>;

export const assignmentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  managerId: z.string().min(1, "Manager is required"),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

// Client-side sign-up form: same rules plus a matching confirmation (not sent to the API)
export const signupFormSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, "Please confirm your password") })
  .refine((val) => val.password === val.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type SignupFormInput = z.infer<typeof signupFormSchema>;

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------- Leaves
export const leaveRequestSchema = z
  .object({
    type: z.enum(enumValues(LEAVE_TYPES), { error: "Please choose a leave type" }),
    fromDate: dateField("From date"),
    toDate: dateField("To date"),
    reason: z.string().trim().min(5, "Reason must be at least 5 characters").max(500, "Reason is too long (max 500)"),
  })
  .superRefine((val, ctx) => {
    if (val.fromDate < todayKey()) {
      ctx.addIssue({ code: "custom", path: ["fromDate"], message: "Leave cannot start in the past" });
    }
    if (val.toDate < val.fromDate) {
      ctx.addIssue({ code: "custom", path: ["toDate"], message: "To date must be on or after the from date" });
      return;
    }
    if (countLeaveDays(val.fromDate, val.toDate) > MAX_LEAVE_SPAN_DAYS) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: `A single request cannot exceed ${MAX_LEAVE_SPAN_DAYS} days`,
      });
    }
  });
export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;

export const requiresHodApproval = (fromDate: string, toDate: string) =>
  countLeaveDays(fromDate, toDate) > CONSECUTIVE_DAYS_LIMIT;

export const reviewSchema = z
  .object({
    action: z.enum(enumValues(REVIEW_ACTIONS), { error: "Invalid review action" }),
    comment: z.string().trim().max(500, "Comment is too long (max 500)").optional().default(""),
  })
  .superRefine((val, ctx) => {
    if (val.action !== REVIEW_ACTIONS.APPROVE && val.comment.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["comment"],
        message:
          val.action === REVIEW_ACTIONS.REJECT
            ? "Please add a reason for rejecting this request"
            : "Please describe what information you need",
      });
    }
  });
export type ReviewInput = z.infer<typeof reviewSchema>;

export const infoResponseSchema = z.object({
  message: z.string().trim().min(3, "Please add a short response").max(500, "Response is too long (max 500)"),
});
export type InfoResponseInput = z.infer<typeof infoResponseSchema>;

// ---------------------------------------------------------------- Queries
const optionalDate = z.string().regex(DATE_REGEX).optional().or(z.literal("").transform(() => undefined));

export const leaveQuerySchema = z.object({
  status: z.enum(enumValues(LEAVE_STATUS)).optional().or(z.literal("").transform(() => undefined)),
  type: z.enum(enumValues(LEAVE_TYPES)).optional().or(z.literal("").transform(() => undefined)),
  from: optionalDate,
  to: optionalDate,
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
export type LeaveQuery = z.infer<typeof leaveQuerySchema>;
