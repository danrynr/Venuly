import { Router } from "express";
import {
  createOrderController,
  payOrderController,
  cancelOrderController,
  adminConfirmOrderController,
} from "../controllers/orderController";
import { authenticateToken } from "../middleware/authMiddleware";
import multer from "multer";

const orderRouter: Router = Router();
const upload = multer();

// All order routes require authentication
orderRouter.use(authenticateToken);

orderRouter.post("/create", upload.none(), createOrderController);
orderRouter.post("/:id/pay", payOrderController);
orderRouter.post("/:id/cancel", upload.none(), cancelOrderController);
orderRouter.post("/:id/confirm", adminConfirmOrderController);

export default orderRouter;
