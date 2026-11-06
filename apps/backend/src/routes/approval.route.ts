import { Router } from "express";
import { REVIEWER_ROLES } from "@elms/shared";
import {
  getPendingApprovals,
  getReviewerStats,
  getTeamHistory,
  reviewLeave,
} from "../controllers/approval.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.use(verifyJWT, authorizeRoles(...REVIEWER_ROLES));

router.get("/pending", getPendingApprovals);
router.get("/history", getTeamHistory);
router.get("/stats", getReviewerStats);
router.post("/:id/review", reviewLeave);

export default router;
