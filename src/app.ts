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
import { swaggerSpec } from "./swagger";

// BigInt Serialization Polyfill
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.get("/docs/swagger.json", (req: Request, res: Response) => {
  res.json(swaggerSpec);
});

app.get("/docs", (req: Request, res: Response) => {
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Venuly API Docs</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/docs/swagger.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`);
});

app.use("/api", router);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
