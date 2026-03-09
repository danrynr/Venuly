import "dotenv/config";
import express, {
  type Application,
  Request,
  Response,
  NextFunction,
} from "express";
import router from "./routes/routes";
import { responseFormatter } from "./middleware/responseFormatter";

// BigInt Serialization Polyfill
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3000;

// Import routes

app.use("/api", router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
