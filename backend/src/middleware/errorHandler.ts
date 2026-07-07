import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { CsvParseError } from "../services/csv.service.js";
import { UploadValidationError } from "./upload.js";

export class AppError extends Error {
  constructor(message: string, readonly statusCode: number = 400) {
    super(message);
    this.name = "AppError";
  }
}

/** Centralized error -> JSON envelope so every failure path returns a consistent shape. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof CsvParseError || err instanceof UploadValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE" ? "File exceeds the 5MB upload limit." : err.message;
    res.status(400).json({ error: message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
}
