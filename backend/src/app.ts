import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import importRoutes from "./routes/import.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api", importRoutes);

  app.use(errorHandler);

  return app;
}
