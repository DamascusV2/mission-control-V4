import research from "../../data/mission-control/research.json";
import { loadFacebookRoster } from "../../lib/data";

export default function ResearchPage() {
  const roster = loadFacebookRoster();
  const membershipQueue = roster
    .flatMap((city) =>
      city.groups
        .filter((group) => {
          const note = (group.notes ?? "").toLowerCase();
          return note.includes("pending") || note.includes("join attempt") || note.includes("requires");
        })
        .map((group) => ({ city: city.city, ...group }))
    )
    .sort((a, b) => {
      const tierA = a.tier ?? "z";
      const tierB = b.tier ?? "z";
      return tierA.localeCompare(tierB);
    });

  const needsList = roster.filter((city) => city.needs.length);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Research Hub</p>
        <h2 className="text-2xl font-semibold">Initiatives</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {research.map((item) => (
          <div key={item.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4 space-y-2">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="text-xs text-[var(--color-slate)]">Owner: {item.owner}</p>
            <p className="text-xs text-white/70">Status: {item.status}</p>
            <p className="text-xs text-white/70">Next: {item.next}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Membership Queue</p>
          <h3 className="text-xl font-semibold">Pending Facebook Group Access</h3>
          <p className="text-white/70 text-sm">Tracked automatically from `lead-intel/facebook-city-roster.md`.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {membershipQueue.map((group) => (
            <div key={`${group.city}-${group.name}`} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
                <span>{group.city}</span>
                <span>{group.tier || ""}</span>
              </div>
              <p className="text-white font-semibold">{group.name}</p>
              <p className="text-white/60 text-xs">{group.description}</p>
              {group.notes && <p className="text-white/40 text-xs">{group.notes}</p>}
              {group.fit && <p className="text-[11px] text-white/40">Fit: {group.fit}</p>}
            </div>
          ))}
          {membershipQueue.length === 0 && <p className="text-white/40 text-sm">No pending membership actions right now.</p>}
        </div>
      </div>
      {needsList.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">City Gaps</p>
            <h3 className="text-xl font-semibold">Still need to source</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {needsList.map((city) => (
              <div key={city.city} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-4 text-sm space-y-2">
                <p className="text-white font-semibold">{city.city}</p>
                <ul className="list-disc list-inside text-white/60 text-xs space-y-1">
                  {city.needs.map((need) => (
                    <li key={need}>{need}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
