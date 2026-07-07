import { Router } from "express";
import rateLimit from "express-rate-limit";
import { csvUpload } from "../middleware/upload.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { handleImportCsv } from "../controllers/import.controller.js";

const router = Router();

// Protects the shared AI API key on a public demo deployment from abuse.
const importLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many imports from this client. Please try again later." },
});

router.post("/imports", importLimiter, csvUpload.single("file"), asyncHandler(handleImportCsv));

export default router;
