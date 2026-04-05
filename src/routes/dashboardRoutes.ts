import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { authenticateToken, hasRole } from "../middleware/authMiddleware";

const router = Router();

// Dashboard access restricted to Admins and Organizers
router.get("/stats", authenticateToken, hasRole(["ADMIN", "ORGANIZER"]), getDashboardStats);

export default router;
