import "dotenv/config";
import express, {
  type Application,
  Request,
  Response,
  NextFunction,
} from "express";
import router from "./routes/routes";
import { responseFormatter } from "./middleware/responseFormatter";
import "./service/queue"; // This starts the worker
import cors from "cors";

// BigInt Serialization Polyfill
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : [];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use("/api", router);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
