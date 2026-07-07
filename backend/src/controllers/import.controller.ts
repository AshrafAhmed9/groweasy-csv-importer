import type { Request, Response } from "express";
import { parseCsv } from "../services/csv.service.js";
import { runExtraction } from "../services/extraction.service.js";
import { createAiProvider } from "../services/ai/index.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ImportSseEvent } from "../types/crm.js";

const provider = createAiProvider();

function writeSseEvent(res: Response, event: ImportSseEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Streams import progress over Server-Sent Events so the frontend can show
 * a live progress bar without polling. The response is committed to SSE
 * (status 200, text/event-stream) as soon as the CSV parses successfully;
 * any failure after that point is reported as an "error" SSE event rather
 * than an HTTP error status, since headers are already flushed.
 */
export async function handleImportCsv(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    throw new AppError("No CSV file was uploaded. Attach a file under field name 'file'.", 400);
  }

  const csvText = req.file.buffer.toString("utf-8");
  const parsed = parseCsv(csvText);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  try {
    const result = await runExtraction(parsed, provider, (progress) => {
      writeSseEvent(res, { type: "progress", ...progress });
    });
    writeSseEvent(res, { type: "result", result });
  } catch (err) {
    console.error("Import processing failed:", err);
    writeSseEvent(res, {
      type: "error",
      message: err instanceof Error ? err.message : "Import processing failed unexpectedly.",
    });
  } finally {
    res.end();
  }
}
