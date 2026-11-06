import { Router } from "express";
import { getDepartments, login, logout, me, refresh, register } from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.get("/departments", getDepartments);
router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", verifyJWT, me);

export default router;
