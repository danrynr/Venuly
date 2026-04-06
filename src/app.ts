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

// BigInt Serialization Polyfill
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use("/api", router);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
