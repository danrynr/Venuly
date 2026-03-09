import { Router } from "express";
import {
  createEventController,
  updateEventController,
  registerEventController,
  leaveEventController,
} from "../controllers/eventController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// All event routes require authentication
router.use(authenticateToken);

router.post("/create", createEventController);
router.put("/:id/update", updateEventController);
router.post("/:id/register", registerEventController);
router.post("/:id/leave", leaveEventController);

export default router;
