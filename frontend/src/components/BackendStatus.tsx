"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { pingHealth } from "@/lib/api";

type Status = "checking" | "online" | "waking" | "offline";

const POLL_INTERVAL_MS = 3000;
const WAKING_THRESHOLD_MS = 4000;

/**
 * Pings the backend /health endpoint on mount. Render's free tier can take
 * 30-60s to spin up from a cold instance; this surfaces a friendly "waking
 * up" state instead of letting the first CSV upload silently hang.
 */
export function useBackendStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const startedAt = Date.now();

    async function poll() {
      if (cancelled) return;
      const ok = await pingHealth();
      if (cancelled) return;

      if (ok) {
        setStatus("online");
        return;
      }

      attempts += 1;
      setStatus(Date.now() - startedAt > WAKING_THRESHOLD_MS ? "waking" : "checking");

      if (attempts < 30) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        setStatus("offline");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

export function BackendStatusBanner({ status }: { status: Status }) {
  if (status === "online" || status === "checking") return null;

  if (status === "waking") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-2.5 text-sm text-warning">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>Waking up the backend (free-tier hosting sleeps when idle) — this can take up to a minute.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5 text-sm text-danger">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>Can&apos;t reach the backend right now. It may still be starting up — try refreshing shortly.</span>
    </div>
  );
}

export function BackendStatusDot({ status }: { status: Status }) {
  const config: Record<Status, { color: string; label: string; icon: React.ReactNode }> = {
    checking: { color: "text-foreground-muted", label: "Checking backend…", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    waking: { color: "text-warning", label: "Waking up backend…", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    online: { color: "text-success", label: "Backend online", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    offline: { color: "text-danger", label: "Backend unreachable", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  };
  const { color, label, icon } = config[status];

  return (
    <div className={`hidden items-center gap-1.5 text-xs font-medium sm:flex ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
