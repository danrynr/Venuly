import { Router } from "express";
import multer from "multer";
import {
  getProfile,
  updateProfile,
  updateProfilePicture,
} from "../controllers/profileController";
import { authenticateToken } from "../middleware/authMiddleware";

const profileRouter: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply authenticateToken to all routes in this router
profileRouter.use(authenticateToken);

profileRouter.get("/detail", getProfile);

// Using upload.none() ensures req.body is populated even if multipart/form-data is used
profileRouter.patch("/update", upload.none(), updateProfile);

profileRouter.patch(
  "/update-picture",
  upload.single("profile_picture"),
  updateProfilePicture
);

export default profileRouter;
