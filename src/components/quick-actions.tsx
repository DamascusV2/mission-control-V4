"use client";

import { useState } from "react";

type ActionDefinition = {
  id: string;
  label: string;
  description: string;
  notes?: string;
};

type ActionHistory = {
  id: string;
  label: string;
  timestamp: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) return "Never";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

export function QuickActions({ actions, history }: { actions: ActionDefinition[]; history: ActionHistory[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [timestamps, setTimestamps] = useState<Record<string, string | null>>(() => {
    return history.reduce((acc, entry) => {
      acc[entry.id] = entry.timestamp;
      return acc;
    }, {} as Record<string, string | null>);
  });
  const [status, setStatus] = useState<string | null>(null);

  async function trigger(actionId: string) {
    setLoadingId(actionId);
    setStatus(null);
    try {
      const response = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionId })
      });
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }
      const data = await response.json();
      const timestamp = data.entry?.timestamp ?? new Date().toISOString();
      setTimestamps((prev) => ({ ...prev, [actionId]: timestamp }));
      setStatus(`${data.entry?.label ?? "Action"} queued at ${formatTimestamp(timestamp)}`);
    } catch (error) {
      console.error("Failed to trigger action", error);
      setStatus("Action failed. Check logs/actions." );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {status && <p className="text-[11px] text-[var(--color-slate)]">{status}</p>}
      <div className="space-y-3">
        {actions.map((action) => (
          <div key={action.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 p-4 flex flex-col gap-3 shadow-panel">
            <div>
              <p className="text-sm font-semibold text-white">{action.label}</p>
              <p className="text-xs text-[var(--color-slate)]">{action.description}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>Last run: {formatTimestamp(timestamps[action.id] ?? null)}</span>
              <button
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-accent)]/40 text-[var(--color-accent)] text-xs hover:bg-[var(--color-accent)]/10 disabled:opacity-50"
                onClick={() => trigger(action.id)}
                disabled={loadingId === action.id}
              >
                {loadingId === action.id ? "Running…" : "Trigger"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
