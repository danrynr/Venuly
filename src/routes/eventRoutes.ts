import { Router } from "express";
import {
  createEventController,
  updateEventController,
  registerEventController,
  leaveEventController,
  eventListController,
} from "../controllers/eventController";
import { authenticateToken } from "../middleware/authMiddleware";
import multer from "multer";

const eventRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All event routes require authentication
eventRouter.use(authenticateToken);

eventRouter.get("/list", eventListController);
eventRouter.post("/create", upload.single("image"), createEventController);
eventRouter.put("/:id/update", upload.none(), updateEventController);
eventRouter.post("/:id/register", registerEventController);
eventRouter.post("/:id/leave", leaveEventController);

export default eventRouter;
