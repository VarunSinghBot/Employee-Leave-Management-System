// ESM evaluates imports before app.ts runs dotenv.config(), so load env here too
import "dotenv/config";
import path from "node:path";
import type { CookieOptions } from "express";

export const API_PREFIX = "/api/v1";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const COOKIE_NAMES = {
  ACCESS: "accessToken",
  REFRESH: "refreshToken",
} as const;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// Tokens live in HTTP-only cookies so client-side JS (and XSS) cannot read them
// COOKIE_SECURE=false allows production builds on plain http (e.g. docker on localhost)
const COOKIE_SECURE = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : IS_PRODUCTION;

const baseCookie: CookieOptions = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};

export const ACCESS_COOKIE_OPTIONS: CookieOptions = { ...baseCookie, maxAge: 15 * MINUTE };
export const REFRESH_COOKIE_OPTIONS: CookieOptions = { ...baseCookie, maxAge: 7 * DAY };
export const CLEAR_COOKIE_OPTIONS: CookieOptions = baseCookie;

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export const BCRYPT_SALT_ROUNDS = 10;

export const RATE_LIMIT = {
  AUTH_WINDOW_MS: 15 * MINUTE,
  AUTH_MAX_REQUESTS: 50,
} as const;

// Prisma "select" blocks reused across queries
export const USER_SUMMARY_SELECT = { id: true, name: true, email: true, role: true } as const;

export const AUTH_USER_SELECT = {
  ...USER_SUMMARY_SELECT,
  department: { select: { id: true, name: true } },
  manager: { select: USER_SUMMARY_SELECT },
} as const;

export const LEAVE_LIST_INCLUDE = {
  employee: { select: { ...USER_SUMMARY_SELECT, department: { select: { id: true, name: true } } } },
  manager: { select: USER_SUMMARY_SELECT },
  hod: { select: USER_SUMMARY_SELECT },
  _count: { select: { documents: true } },
} as const;

export const LEAVE_DETAIL_INCLUDE = {
  ...LEAVE_LIST_INCLUDE,
  employee: {
    select: {
      ...USER_SUMMARY_SELECT,
      managerId: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  },
  documents: {
    select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  },
  comments: {
    select: { id: true, kind: true, message: true, createdAt: true, author: { select: USER_SUMMARY_SELECT } },
    orderBy: { createdAt: "asc" },
  },
} as const;
