import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { DOCUMENT_RULES } from "@elms/shared";
import { IS_PRODUCTION } from "../constants.js";
import { ApiError, type FieldError } from "../utils/ApiError.util.js";
import { getUploadedFiles, removeUploadedFiles } from "../utils/file.util.js";

const MULTER_MESSAGES: Partial<Record<multer.ErrorCode, string>> = {
  LIMIT_FILE_SIZE: `Each file must be smaller than ${DOCUMENT_RULES.maxFileSizeMB} MB`,
  LIMIT_FILE_COUNT: `You can attach up to ${DOCUMENT_RULES.maxFiles} files`,
  LIMIT_UNEXPECTED_FILE: `You can attach up to ${DOCUMENT_RULES.maxFiles} files`,
};

const toApiError = (err: unknown): ApiError => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const errors: FieldError[] = err.issues.map((issue) => ({
      field: issue.path.join(".") || "form",
      message: issue.message,
    }));
    return new ApiError(422, errors[0]?.message ?? "Please check the highlighted fields", errors);
  }

  if (err instanceof multer.MulterError) {
    return ApiError.badRequest(MULTER_MESSAGES[err.code] ?? "File upload failed, please try again");
  }

  const dbUnreachable = new ApiError(503, "Cannot connect to the database. Check DATABASE_URL in apps/backend/.env");
  if (err instanceof Prisma.PrismaClientInitializationError) return dbUnreachable;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P1001" || err.code === "P1000") return dbUnreachable;
    if (err.code === "P2002") return ApiError.conflict("A record with these details already exists");
    if (err.code === "P2025") return ApiError.notFound();
  }

  if (err instanceof SyntaxError && "body" in err) return ApiError.badRequest("Request body is not valid JSON");

  console.error("Unhandled error:", err);
  return new ApiError(500, "Something went wrong on our side. Please try again in a moment");
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
};

// Central error handler: every thrown error ends here and becomes a friendly JSON message
export const errorHandler = async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const files = getUploadedFiles(req);
  if (files.length) await removeUploadedFiles(files);

  const apiError = toApiError(err);
  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    errors: apiError.errors.length ? apiError.errors : undefined,
    ...(IS_PRODUCTION || apiError.statusCode < 500 ? {} : { stack: (err as Error)?.stack }),
  });
};
