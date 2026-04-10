import { Router } from "express";
import multer from "multer";
import {
  createEventController,
  updateEventController,
  registerEventController,
  leaveEventController,
  eventListController,
  getAttendeeListController,
  uploadEventImageController,
} from "../controllers/eventController";
import { authenticateToken, hasRole } from "../middleware/authMiddleware";

const eventRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
eventRouter.get("/list", eventListController);

// All other event routes require authentication
eventRouter.use(authenticateToken);

// Create event (Metadata only - fast)
eventRouter.post(
  "/create",
  hasRole(["ADMIN", "ORGANIZER"]),
  upload.none(),
  createEventController
);

// Upload/Update event image (Separate slow process)
eventRouter.patch(
  "/:id/image",
  hasRole(["ADMIN", "ORGANIZER"]),
  upload.single("image"),
  uploadEventImageController
);

eventRouter.put(
  "/:id/update",
  hasRole(["ADMIN", "ORGANIZER"]),
  upload.none(),
  updateEventController
);

eventRouter.post("/:id/register", registerEventController);
eventRouter.post("/:id/leave", leaveEventController);

eventRouter.get(
  "/:id/attendees",
  hasRole(["ADMIN", "ORGANIZER"]),
  getAttendeeListController
);

export default eventRouter;
