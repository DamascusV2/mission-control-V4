import { loadStatus, loadTeam } from "../../lib/data";
import type { Agent, LiveAgentStatus, StatusPayload, TeamData } from "../../types/mission-control";

type AgentRosterEntry = Agent & {
  presence: string;
  workload: string;
  lastUpdate?: string | null;
};

const fallbackTask = {
  damascus: "Mission Control polish",
  zay: "Field ops",
  charlie: "On deck",
  violet: "Research backlog"
};

export default function AgentStatusPage() {
  const team = loadTeam() as TeamData;
  const status = loadStatus() as StatusPayload;
  const liveAgents: LiveAgentStatus[] = status.__live?.agents ?? [];

  const roster: AgentRosterEntry[] = team.agents.map((agent) => {
    const live = liveAgents.find((entry) => entry.id === agent.id);
    return {
      ...agent,
      presence: live?.presence ?? agent.status,
      workload: live?.workload ?? "Unknown",
      lastUpdate: live?.lastUpdate ?? null
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Agent Roster</p>
        <h2 className="text-2xl font-semibold">Status Board</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {roster.map((agent) => (
          <div key={agent.id} className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{agent.name}</p>
                <p className="text-xs text-white/50">{agent.role}</p>
              </div>
              <span className="text-xs text-white/50">{agent.presence}</span>
            </div>
            <p className="text-xs text-white/60">Focus: {agent.focus}</p>
            <p className="text-xs text-white/60">Current Task: {fallbackTask[agent.id as keyof typeof fallbackTask] ?? "TBD"}</p>
            <p className="text-xs text-white/60">Workload: {agent.workload}</p>
            {agent.lastUpdate && (
              <p className="text-[11px] text-white/40">
                Updated {new Date(agent.lastUpdate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
