import fs from "node:fs/promises";
import path from "node:path";
import type { Request } from "express";
import { UPLOAD_DIR } from "../constants.js";

export const getUploadedFiles = (req: Request): Express.Multer.File[] =>
  Array.isArray(req.files) ? req.files : [];

// Cleans up uploaded files when a request fails after multer already stored them
export const removeUploadedFiles = async (files: Express.Multer.File[]) => {
  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
};

export const resolveStoredFile = (storedName: string) => path.join(UPLOAD_DIR, path.basename(storedName));

// Rows for a nested `documents: { create: ... }` on a leave request
export const toDocumentRows = (files: Express.Multer.File[], uploadedById: string) =>
  files.map((file) => ({
    uploadedById,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
  }));
