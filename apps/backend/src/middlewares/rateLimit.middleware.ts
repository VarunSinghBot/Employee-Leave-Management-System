import rateLimit from "express-rate-limit";
import { RATE_LIMIT } from "../constants.js";

// Slows down brute-force attempts on login/register
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  limit: RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please wait a few minutes and try again" },
});
