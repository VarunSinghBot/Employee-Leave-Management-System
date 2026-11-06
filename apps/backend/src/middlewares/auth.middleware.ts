import type { NextFunction, Request, Response } from "express";
import type { Role } from "@elms/shared";
import prisma from "../db/prisma.db.js";
import { COOKIE_NAMES } from "../constants.js";
import { ApiError } from "../utils/ApiError.util.js";
import { verifyAccessToken } from "../utils/token.util.js";

export interface RequestUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string;
  managerId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

// Reads the access token from the HTTP-only cookie (or a Bearer header) and attaches the user
export const verifyJWT = async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAMES.ACCESS] ?? req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw ApiError.unauthorized();

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    throw ApiError.unauthorized("Your session has expired, please sign in again");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, departmentId: true, managerId: true },
  });
  if (!user) throw ApiError.unauthorized("Your account no longer exists");

  req.user = user;
  next();
};

// Use after verifyJWT: guarantees req.user exists in controllers
export const currentUser = (req: Request): RequestUser => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};
