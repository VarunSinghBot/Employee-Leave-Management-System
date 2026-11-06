import { Router } from "express";
import {
  applyLeave,
  cancelLeave,
  getBalance,
  getLeaveById,
  getMyLeaves,
  respondToInfoRequest,
  updateLeave,
  viewDocument,
} from "../controllers/leave.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadDocuments } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getMyLeaves).post(uploadDocuments, applyLeave);
router.get("/balance", getBalance);
router.route("/:id").get(getLeaveById).patch(uploadDocuments, updateLeave);
router.post("/:id/cancel", cancelLeave);
router.post("/:id/respond", uploadDocuments, respondToInfoRequest);
router.get("/:id/documents/:documentId", viewDocument);

export default router;
