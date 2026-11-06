import { Router } from "express";
import { ROLES } from "@elms/shared";
import { assignEmployee, createManagementAccount, getManagementOverview } from "../controllers/management.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/role.middleware.js";

const router = Router();

router.use(verifyJWT, authorizeRoles(ROLES.HOD));
router.get("/", getManagementOverview);
router.post("/accounts", createManagementAccount);
router.patch("/assignments", assignEmployee);

export default router;
