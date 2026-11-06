import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verifyJWT, getAuditLogs);

export default router;
