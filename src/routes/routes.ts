import { Router, Request, Response, json, urlencoded } from "express";
import { responseFormatter } from "../middleware/responseFormatter";
import { requestLogger } from "../middleware/requestLogger"; // Assuming this exists
import authRouter from "./authRoutes"; // Import the new auth router
import profileRouter from "./profileRoutes"; // Import the new profile router
import eventRouter from "./eventRoutes"; // Import the new event router
import orderRouter from "./orderRoutes"; // Import the new order router
import reviewRouter from "./reviewRoutes"; // Import the review router
import dashboardRouter from "./dashboardRoutes"; // Import the dashboard router

const router: Router = Router();

if (process.env.ENV === "development") {
  router.use(requestLogger);
}
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

// Routes
router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/event", eventRouter);
router.use("/order", orderRouter);
router.use("/review", reviewRouter);
router.use("/dashboard", dashboardRouter);

export default router;
