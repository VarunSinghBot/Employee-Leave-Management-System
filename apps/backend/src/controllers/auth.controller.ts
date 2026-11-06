import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AUDIT_ACTIONS, ROLES, loginSchema, registerSchema } from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { AUTH_USER_SELECT, BCRYPT_SALT_ROUNDS, COOKIE_NAMES } from "../constants.js";
import { currentUser } from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.util.js";
import { sendResponse } from "../utils/ApiResponse.util.js";
import { recordAudit } from "../utils/audit.util.js";
import { clearAuthCookies, hashToken, issueAuthCookies, verifyRefreshToken } from "../utils/token.util.js";

const getProfile = (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: AUTH_USER_SELECT });

export const getDepartments = async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  sendResponse(res, 200, "Departments fetched", departments);
};

export const register = async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);

  const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
  if (!department) throw ApiError.badRequest("The selected department does not exist");

  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw ApiError.conflict("An account with this email already exists. Try signing in instead");

  // New sign-ups are employees; they report to the department's manager (or HOD as fallback)
  const approver =
    (await prisma.user.findFirst({ where: { departmentId: department.id, role: ROLES.MANAGER } })) ??
    (await prisma.user.findFirst({ where: { departmentId: department.id, role: ROLES.HOD } }));

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS),
      role: ROLES.EMPLOYEE,
      departmentId: department.id,
      managerId: approver?.id ?? null,
    },
    select: { id: true },
  });

  await issueAuthCookies(res, user.id);
  await recordAudit({ req, action: AUDIT_ACTIONS.USER_REGISTERED, entity: "User", entityId: user.id, actorId: user.id });
  sendResponse(res, 201, "Account created successfully", await getProfile(user.id));
};

export const login = async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true, password: true } });
  if (!user || !(await bcrypt.compare(input.password, user.password))) {
    throw ApiError.unauthorized("Incorrect email or password");
  }

  await issueAuthCookies(res, user.id);
  await recordAudit({ req, action: AUDIT_ACTIONS.USER_LOGIN, entity: "User", entityId: user.id, actorId: user.id });
  sendResponse(res, 200, "Welcome back!", await getProfile(user.id));
};

// Rotates the refresh token and issues a new 15-minute access token
export const refresh = async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.[COOKIE_NAMES.REFRESH];
  if (!token) throw ApiError.unauthorized("Your session has ended, please sign in again");

  let userId: string;
  try {
    userId = verifyRefreshToken(token).sub;
  } catch {
    clearAuthCookies(res);
    throw ApiError.unauthorized("Your session has ended, please sign in again");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, refreshToken: true } });
  if (!user || user.refreshToken !== hashToken(token)) {
    clearAuthCookies(res);
    throw ApiError.unauthorized("Your session is no longer valid, please sign in again");
  }

  await issueAuthCookies(res, user.id);
  sendResponse(res, 200, "Session refreshed", null);
};

export const logout = async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.[COOKIE_NAMES.REFRESH];
  if (token) {
    const user = await prisma.user.findFirst({ where: { refreshToken: hashToken(token) }, select: { id: true } });
    if (user) {
      await prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
      await recordAudit({ req, action: AUDIT_ACTIONS.USER_LOGOUT, entity: "User", entityId: user.id, actorId: user.id });
    }
  }
  clearAuthCookies(res);
  sendResponse(res, 200, "Signed out successfully", null);
};

export const me = async (req: Request, res: Response) => {
  sendResponse(res, 200, "Profile fetched", await getProfile(currentUser(req).id));
};
