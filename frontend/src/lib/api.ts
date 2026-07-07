import type { ImportSseEvent } from "./types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {}

export async function pingHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Uploads the CSV and streams back Server-Sent Events (progress + final
 * result). Uses `fetch` with a manually parsed streaming body rather than
 * `EventSource`, since EventSource cannot send POST/multipart requests.
 */
export async function importCsv(
  file: File,
  onEvent: (event: ImportSseEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/imports`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok || !response.body) {
    let message = `Import request failed with status ${response.status}.`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // response wasn't JSON; keep default message
    }
    throw new ApiError(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const event = JSON.parse(line.slice(6)) as ImportSseEvent;
        onEvent(event);
      } catch {
        // ignore malformed frame
      }
    }
  }
}
