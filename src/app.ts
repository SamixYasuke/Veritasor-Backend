import express, { type Express } from "express";
import cors from "cors";
import type { Server } from "node:http";
import { config } from "./config/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import {
  apiVersionMiddleware,
  versionResponseMiddleware,
} from "./middleware/apiVersion.js";
import { analyticsRouter } from "./routes/analytics.js";
import { authRouter } from "./routes/auth.js";
import { attestationsRouter } from "./routes/attestations.js";
import businessRoutes from "./routes/businesses.js";
import { healthRouter } from "./routes/health.js";
import integrationsRouter from "./routes/integrations.js";
import { integrationsShopifyRouter } from "./routes/integrations-shopify.js";

const app: Express = express();

app.use(apiVersionMiddleware);
app.use(versionResponseMiddleware);
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/attestations", attestationsRouter);
app.use("/api/businesses", businessRoutes);
app.use("/api/analytics", analyticsRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/shopify", integrationsShopifyRouter);

app.use(errorHandler);

export async function startServer(port: number): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[Server] Running on port ${port}`);
      resolve(server);
    });
  });
}

export { app };
