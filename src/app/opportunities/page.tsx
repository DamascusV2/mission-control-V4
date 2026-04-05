import { OpportunityBoard } from "../../components/opportunity-board";
import opportunities from "../../data/mission-control/opportunities.json";

export const dynamic = "force-dynamic";

export default function OpportunitiesPage() {
  const total = opportunities.length;
  const hot = opportunities.filter((opportunity) => opportunity.severity === "hot").length;
  const ready = opportunities.filter((opportunity) => opportunity.status === "ready").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Opportunity Scanner</p>
        <h2 className="text-2xl font-semibold">Signals</h2>
        <p className="text-white/60 text-sm mt-2">Organize homeowner intel, contractor demand, and automation plays in one view.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4">
          <p className="text-white/50 text-xs">Total Signals</p>
          <p className="text-3xl font-semibold">{total}</p>
        </div>
        <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4">
          <p className="text-white/50 text-xs">Hot / High Severity</p>
          <p className="text-3xl font-semibold">{hot}</p>
        </div>
        <div className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4">
          <p className="text-white/50 text-xs">Ready for Outreach</p>
          <p className="text-3xl font-semibold">{ready}</p>
        </div>
      </div>
      <OpportunityBoard opportunities={opportunities} />
    </div>
  );
}
