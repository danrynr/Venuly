import { Router } from "express";
import {
  createOrderController,
  payOrderController,
  cancelOrderController,
  adminConfirmOrderController,
  adminRejectOrderController,
  listOrdersController,
  getMyOrdersController,
  createVoucherController,
} from "../controllers/orderController";
import { authenticateToken, hasRole } from "../middleware/authMiddleware";
import multer from "multer";

const orderRouter: Router = Router();
const upload = multer();

// All order routes require authentication
orderRouter.use(authenticateToken);

orderRouter.get("/list", hasRole(["ADMIN", "ORGANIZER"]), listOrdersController);
orderRouter.get("/my", hasRole(["CUSTOMER"]), getMyOrdersController);
orderRouter.post("/create", upload.none(), createOrderController);
orderRouter.post("/:id/pay", upload.single("payment_proof"), payOrderController);
orderRouter.post("/:id/cancel", upload.none(), cancelOrderController);

// Organizers can now confirm/reject orders for their own events
orderRouter.post("/:id/confirm", hasRole(["ADMIN", "ORGANIZER"]), adminConfirmOrderController);
orderRouter.post("/:id/reject", hasRole(["ADMIN", "ORGANIZER"]), adminRejectOrderController);

// Voucher Management (Organizers only for their events)
orderRouter.post("/vouchers", hasRole(["ADMIN", "ORGANIZER"]), upload.none(), createVoucherController);

export default orderRouter;
