import { Router } from "express";
import {
  registerController,
  loginController,
  refreshController,
  logoutController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
} from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";

const authRouter: Router = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", authenticateToken, logoutController);

// Password Management
authRouter.post("/change-password", authenticateToken, changePasswordController);
authRouter.post("/forgot-password", forgotPasswordController);
authRouter.post("/reset-password", resetPasswordController);

export default authRouter;
