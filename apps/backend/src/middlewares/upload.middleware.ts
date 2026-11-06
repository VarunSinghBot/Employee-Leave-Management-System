import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { DOCUMENT_RULES } from "@elms/shared";
import { UPLOAD_DIR } from "../constants.js";
import { ApiError } from "../utils/ApiError.util.js";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const allowedMimeTypes: readonly string[] = DOCUMENT_RULES.allowedMimeTypes;

// Accepts up to 5 supporting documents under the "documents" field
export const uploadDocuments = multer({
  storage,
  limits: { fileSize: DOCUMENT_RULES.maxFileSizeMB * 1024 * 1024, files: DOCUMENT_RULES.maxFiles },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest(`"${file.originalname}" is not supported. Upload PDF, PNG, JPG or WEBP files`));
  },
}).array("documents", DOCUMENT_RULES.maxFiles);
