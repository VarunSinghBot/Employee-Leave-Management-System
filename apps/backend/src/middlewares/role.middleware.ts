import type { NextFunction, Request, Response } from "express";
import type { Role } from "@elms/shared";
import { ApiError } from "../utils/ApiError.util.js";

// RBAC guard: authorizeRoles("MANAGER", "HOD")
export const authorizeRoles =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden("This area is only available to managers and heads of department");
    }
    next();
  };
