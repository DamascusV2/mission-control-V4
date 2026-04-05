"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Loader2, Send } from "lucide-react";

type Opportunity = {
  id: string;
  category: string;
  city?: string;
  signal: string;
  status: string;
  severity: string;
  owner: string;
  source?: string;
  eta?: string;
  value?: string;
  next?: string;
  link?: string;
  notes?: string;
};

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Investigating", value: "investigating" },
  { label: "Research", value: "research" }
];

const severityFilters = [
  { label: "All", value: "all" },
  { label: "Hot", value: "hot" },
  { label: "Warm", value: "warm" },
  { label: "Watch", value: "watch" }
];

export function OpportunityBoard({ opportunities }: { opportunities: Opportunity[] }) {
  const [status, setStatus] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return opportunities.filter((opportunity) => {
      const matchesStatus = status === "all" || opportunity.status === status;
      const matchesSeverity = severity === "all" || opportunity.severity === severity;
      const matchesSearch = search
        ? opportunity.signal.toLowerCase().includes(search.toLowerCase()) ||
          (opportunity.city ?? "").toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesStatus && matchesSeverity && matchesSearch;
    });
  }, [opportunities, search, severity, status]);

  function handleStatusChange(value: string) {
    setStatus(value);
  }

  function handleSeverityChange(value: string) {
    setSeverity(value);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  async function sendToOutreach(opportunity: Opportunity) {
    setActionId(opportunity.id);
    setIsSubmitting(true);
    try {
      await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opportunity.id, action: "outreach", payload: opportunity })
      });
      setLastAction(`Queued ${opportunity.city || opportunity.category} for outreach`);
    } catch (error) {
      console.error("Failed to queue opportunity", error);
      setLastAction("Failed to send—check server logs.");
    } finally {
      setIsSubmitting(false);
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              className={`px-3 py-1 rounded-full text-xs border ${
                status === filter.value ? "border-[var(--color-accent)] text-white" : "border-white/10 text-white/60"
              }`}
              onClick={() => handleStatusChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {severityFilters.map((filter) => (
            <button
              key={filter.value}
              className={`px-3 py-1 rounded-full text-xs border ${
                severity === filter.value ? "border-[#FFB84D] text-white" : "border-white/10 text-white/60"
              }`}
              onClick={() => handleSeverityChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        placeholder="Search by city, signal, or keyword"
        value={search}
        onChange={handleSearchChange}
        className="w-full rounded-xl bg-white/5 border accent-border px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-accent)]"
      />
      {lastAction && <p className="text-xs text-white/50">{lastAction}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((opportunity) => (
          <div key={opportunity.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>{opportunity.category} · {opportunity.city ?? "Unknown"}</span>
              <span className="uppercase">{opportunity.severity}</span>
            </div>
            <p className="text-white font-semibold text-sm">{opportunity.signal}</p>
            <p className="text-white/60 text-xs">Status: {opportunity.status} · Owner: {opportunity.owner}</p>
            {opportunity.value && <p className="text-white/60 text-xs">Est. value: {opportunity.value}</p>}
            {opportunity.next && <p className="text-sm text-white/80">Next: {opportunity.next}</p>}
            {opportunity.notes && <p className="text-xs text-white/50">Notes: {opportunity.notes}</p>}
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>{opportunity.source}</span>
              <span>{opportunity.eta ? `ETA: ${opportunity.eta}` : null}</span>
            </div>
            <div className="flex gap-2">
              {opportunity.link && (
                <a
                  href={opportunity.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--color-accent)] hover:underline"
                >
                  View Source
                </a>
              )}
              <button
                className="ml-auto inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-[var(--color-accent)]/40 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 disabled:opacity-60"
                disabled={isSubmitting && actionId === opportunity.id}
                onClick={() => sendToOutreach(opportunity)}
              >
                {isSubmitting && actionId === opportunity.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send to Outreach
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-white/40 text-sm">No opportunities match that filter.</p>}
      </div>
    </div>
  );
}
