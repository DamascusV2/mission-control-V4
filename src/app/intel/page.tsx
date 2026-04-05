const intel = [
  { id: "intel-001", source: "Reuters", summary: "U.S. unemployment ticked to 4.4% amid higher oil prices.", time: "2026-03-08 09:00" },
  { id: "intel-002", source: "NOAA", summary: "Severe weather outlook elevated for Gulf states this week.", time: "2026-03-08 07:30" },
  { id: "intel-003", source: "Ops", summary: "Discord HQ channels live; awaiting automation wiring.", time: "2026-03-08 20:30" }
];

export default function IntelPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Intel Feed</p>
        <h2 className="text-2xl font-semibold">Signals</h2>
      </div>
      <div className="space-y-4">
        {intel.map((item) => (
          <div key={item.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>{item.source}</span>
              <span>{item.time}</span>
            </div>
            <p className="text-sm text-white/80 mt-2">{item.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
