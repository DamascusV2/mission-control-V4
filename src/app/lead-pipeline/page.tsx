import { loadLeadTracker } from "../../lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const placeholderMessage = "No entries yet";

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
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

export default function LeadPipelinePage() {
  const leads = loadLeadTracker();
  const hot = leads.hot?.slice(0, 6) ?? [];
  const near = leads.near?.slice(0, 6) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Lead Engine</p>
        <h2 className="text-2xl font-semibold">Pipeline Tracker</h2>
      </div>
      <div className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-5 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-[var(--color-slate)]">Total Leads</p>
          <p className="text-3xl font-semibold">{leads.summary.total}</p>
        </div>
        <div>
          <p className="text-[var(--color-slate)]">New Today</p>
          <p className="text-3xl font-semibold text-[#35D7FF]">+{leads.summary.newToday}</p>
        </div>
        <div>
          <p className="text-[var(--color-slate)]">HOT Queue</p>
          <p className="text-3xl font-semibold text-[#16C784]">{leads.summary.priority}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {leads.pipelines.map((pipeline) => (
          <div key={pipeline.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4 space-y-2">
            <p className="text-sm font-semibold text-white">{pipeline.name}</p>
            <p className="text-xs text-[var(--color-slate)]">Stage: {pipeline.stage}</p>
            <p className="text-xs text-white/70">Leads: {pipeline.leads}</p>
            <p className="text-xs text-white/70">Next: {pipeline.next}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Hot Leads</p>
              <p className="text-lg font-semibold">Score ≥ 7</p>
            </div>
            <span className="text-[var(--color-slate)] text-sm">{hot.length} showing</span>
          </div>
          <div className="space-y-3 text-sm">
            {hot.length === 0 && <p className="text-white/40 text-xs">{placeholderMessage}</p>}
            {hot.map((lead) => (
              <div key={`${lead.link}-${lead.__iso}`} className="bg-white/5 rounded-xl p-3 space-y-1 border border-white/10">
                <div className="flex justify-between text-xs text-[var(--color-slate)]">
                  <span>{lead.city || lead.group_name || "Unknown"}</span>
                  <span>{formatDate(typeof lead.__iso === "string" ? lead.__iso : undefined)}</span>
                </div>
                <p className="text-white font-medium">{lead.service_category || lead.notes || "Lead"}</p>
                <p className="text-white/60 text-xs">Group: {lead.group_name || "n/a"}</p>
                <p className="text-white/60 text-xs">Score: {lead.lead_score || "-"} · Next: {lead.notes || "Review"}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Near-Miss Watchlist</p>
              <p className="text-lg font-semibold">Signals to revisit</p>
            </div>
            <span className="text-[var(--color-slate)] text-sm">{near.length} showing</span>
          </div>
          <div className="space-y-3 text-sm">
            {near.length === 0 && <p className="text-white/40 text-xs">{placeholderMessage}</p>}
            {near.map((lead) => (
              <div key={`${lead.link}-${lead.__iso}-near`} className="bg-white/5 rounded-xl p-3 space-y-1 border border-white/10">
                <div className="flex justify-between text-xs text-[var(--color-slate)]">
                  <span>{lead.city || lead.group_name || "Unknown"}</span>
                  <span>{formatDate(typeof lead.__iso === "string" ? lead.__iso : undefined)}</span>
                </div>
                <p className="text-white font-medium">{lead.service_category || "Opportunity"}</p>
                <p className="text-white/60 text-xs">Notes: {lead.notes || "Monitor thread"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
