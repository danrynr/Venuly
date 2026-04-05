import "dotenv/config";
import express, {
  type Application,
  Request,
  Response,
  NextFunction,
} from "express";
import router from "./routes/routes";
import { startCronJobs } from "./utils/cron";
import { responseFormatter } from "./middleware/responseFormatter";

// BigInt Serialization Polyfill
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use("/api", router);

// Start Background Jobs
startCronJobs();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
