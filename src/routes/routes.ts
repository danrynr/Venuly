import { Router, Request, Response, json, urlencoded } from "express";
import { responseFormatter } from "../middleware/responseFormatter";
import { requestLogger } from "../middleware/requestLogger"; // Assuming this exists
import authRouter from "./authRoutes"; // Import the new auth router
import profileRouter from "./profileRoutes"; // Import the new profile router
import eventRouter from "./eventRoutes"; // Import the new event router
import orderRouter from "./orderRoutes"; // Import the new order router
import reviewRouter from "./reviewRoutes"; // Import the review router

const router: Router = Router();

router.use(requestLogger);
router.use(json());
router.use(urlencoded({ extended: true }));

router.get("/status", (req: Request, res: Response) => {
  const response = responseFormatter({
    code: 200,
    status: "success",
    message: "API is running",
  });
  res.send(response);
});

// Auth Routes
router.use("/auth", authRouter); // Use the new auth router
router.use("/profile", profileRouter); // Use the profile router
router.use("/event", eventRouter); // Use the event router
router.use("/order", orderRouter); // Use the order router
router.use("/review", reviewRouter); // Use the review router

export default router;
