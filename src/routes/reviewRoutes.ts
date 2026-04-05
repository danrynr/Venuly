import { Router } from "express";
import {
  createReviewController,
  getEventReviewsController,
  getOrganizerReviewsController,
} from "../controllers/reviewController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// Public routes
router.get("/event/:id", getEventReviewsController);
router.get("/organizer/:id", getOrganizerReviewsController);

// Protected routes
router.post("/", authenticateToken, createReviewController);

export default router;
