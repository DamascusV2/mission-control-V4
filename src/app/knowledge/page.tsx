import { loadTeam } from "../../lib/data";

const docs = [
  { id: "doc-ops", title: "Ops Doctrine", summary: "Phase 1 → Phase 4 roadmap, mission command, reporting cadence." },
  { id: "doc-camera", title: "Athena Monitoring", summary: "Insta360 pipeline, detection stack, low-light gaps." },
  { id: "doc-roof", title: "Mission 001 Dossier", summary: "Roofing Lead Engine research, storm feeds, property data." }
];

export default function KnowledgePage() {
  const team = loadTeam();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Knowledge Vault</p>
        <h2 className="text-2xl font-semibold">Mission Doctrine</h2>
      </div>
      <div className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-6">
        <p className="text-sm text-[var(--color-slate)]">Mission</p>
        <p className="text-lg font-semibold">{team.mission}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
          {team.principles.map((principle: string) => (
            <span key={principle} className="px-3 py-1 rounded-full bg-white/10">{principle}</span>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {docs.map((doc) => (
          <div key={doc.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-5">
            <p className="text-sm font-semibold text-white">{doc.title}</p>
            <p className="text-sm text-white/70 mt-2">{doc.summary}</p>
            <p className="text-xs text-[var(--color-slate)] mt-4">Updated daily</p>
          </div>
        ))}
      </div>
    </div>
  );
}
