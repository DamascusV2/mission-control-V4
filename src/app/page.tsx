import Link from "next/link";
import { QuickActions } from "../components/quick-actions";
import actions from "../data/mission-control/actions.json";
import { loadActionHistory, loadStatus, loadVector } from "../lib/data";
import { loadLiveAutomation, loadLiveDeployments } from "../lib/live-sources";
import type { AutomationEvent, DeploymentEntry, LiveSystemCheck, ModuleMapEntry, ModuleState, ModuleStatus, QueueItem, StatusPayload, VectorPayload } from "../types/mission-control";

type Highlight = { label: string; value: string; detail: string };

const highlightAccents: Record<string, string> = {
  "Operational Tempo": "text-[#35D7FF]",
  "System Signals": "text-[#FFB84D]",
  "Automation Runs": "text-[#16C784]"
};

function computeHighlights(status: StatusPayload, automationEvents: AutomationEvent[]): Highlight[] {
  const activity = status.activity ?? [];
  const now = Date.now();
  const sixHoursAgo = now - 6 * 60 * 60 * 1000;
  const recentActivity = activity.filter((item) => new Date(item.timestamp).getTime() >= sixHoursAgo);
  const tempoValue = recentActivity.length >= 4 ? "High" : recentActivity.length >= 2 ? "Steady" : "Idle";

  const tempoHighlight: Highlight = {
    label: "Operational Tempo",
    value: tempoValue,
    detail: `${recentActivity.length} events · 6h`
  };

  const live = status.__live;
  const systemChecks: LiveSystemCheck[] = live?.systemHealth ?? [];
  const warnCount = systemChecks.filter((check) => check.status !== "PASS").length;
  const intelHighlight: Highlight = {
    label: "System Signals",
    value: warnCount ? `${warnCount} WARN` : "Stable",
    detail: warnCount ? "Attention required" : "All clear"
  };

  const automationHighlight: Highlight = {
    label: "Automation Runs",
    value: String(automationEvents.length ?? 0),
    detail: "logged releases"
  };

  return [tempoHighlight, intelHighlight, automationHighlight];
}

const stateStyles: Record<ModuleState, string> = {
  "Live": "text-[#16C784] bg-[#16C784]/10 border-[#16C784]/40",
  "In Progress": "text-[#35D7FF] bg-[#35D7FF]/10 border-[#35D7FF]/30",
  "Not Started": "text-white/70 bg-white/5 border-white/10",
  "Blocked": "text-[#FFB84D] bg-[#FFB84D]/10 border-[#FFB84D]/30"
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York"
});

const navLinks = [
  { label: "Command", href: "/" },
  { label: "Task Board", href: "/task-board" },
  { label: "Projects", href: "/projects" },
  { label: "Calendar", href: "/calendar" },
  { label: "Lead Pipeline", href: "/lead-pipeline" },
  { label: "Intel Feed", href: "/intel" }
];

function formatTime(timestamp: string) {
  return timeFormatter.format(new Date(timestamp));
}

function minutesSince(timestamp: string) {
  const updated = new Date(timestamp).getTime();
  if (Number.isNaN(updated)) return null;
  const diffMs = Date.now() - updated;
  return diffMs < 0 ? 0 : Math.round(diffMs / 60000);
}

function formatAge(minutes: number | null) {
  if (minutes === null) return null;
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function StatusPanel({ title, items, staleAfterMinutes }: { title: string; items: ModuleStatus[]; staleAfterMinutes?: number }) {
  return (
    <div className="glass-card rounded-3xl border border-white/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">{title === "Build Status" ? "Vector" : "Runtime"}</p>
          <h3 className="text-2xl font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-white/40">Not Started / In Progress / Live / Blocked</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{item.name}</p>
              <span className={`text-xs px-3 py-1 rounded-full border ${stateStyles[item.state]}`}>{item.state}</span>
            </div>
            <div className="text-xs text-white/50 flex flex-wrap items-center gap-2 justify-between">
              <span>Owner: {item.owner}</span>
              <div className="flex items-center gap-2">
                <span>Updated {formatTime(item.updated)}</span>
                {(() => {
                  const minutes = minutesSince(item.updated);
                  const age = formatAge(minutes);
                  const isStale = typeof minutes === "number" && typeof staleAfterMinutes === "number" && minutes > staleAfterMinutes;
                  return isStale && age ? <span className="text-amber-300 font-semibold">STALE · {age}</span> : age ? <span className="text-white/40">· {age} old</span> : null;
                })()}
              </div>
            </div>
            <p className="text-sm text-white/70">{item.notes}</p>
            {item.blocker && <p className="text-xs text-amber-300/80">Blocker: {item.blocker}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleMapPanel({ entries }: { entries: ModuleMapEntry[] }) {
  return (
    <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 space-y-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Module Map</p>
          <h3 className="text-2xl font-semibold">System Modules</h3>
        </div>
        <span className="text-xs text-[var(--color-slate)]">Phase + dependencies</span>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{entry.module}</p>
                <p className="text-xs text-[var(--color-slate)]">{entry.phase} • Owner: {entry.owner}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border ${stateStyles[entry.state]}`}>{entry.state}</span>
            </div>
            <p className="text-sm text-white/80">{entry.notes}</p>
            {entry.dependencies?.length ? (
              <p className="text-xs text-[var(--color-slate)]">Dependencies: {entry.dependencies.join(", ")}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}


function QueuePanel({ items }: { items: QueueItem[] }) {
  return (
    <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 space-y-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Roadmap</p>
          <h3 className="text-2xl font-semibold">Queue</h3>
        </div>
        <span className="text-xs text-[var(--color-slate)]">Next slices</span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-[var(--color-slate)]">Owner: {item.owner}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border ${stateStyles[item.state]}`}>{item.state}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)] mt-1">
              <span>ETA: {item.eta}</span>
            </div>
            {item.notes && <p className="text-sm text-white/80 mt-2">{item.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DeploymentPanel({ releases }: { releases: DeploymentEntry[] }) {
  return (
    <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 space-y-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Deployments</p>
          <h3 className="text-2xl font-semibold">Release Log</h3>
        </div>
        <span className="text-xs text-[var(--color-slate)]">Artifacts + owners</span>
      </div>
      <div className="space-y-3">
        {releases.map((release) => (
          <div key={release.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>{formatTime(release.timestamp)}</span>
              <span>{release.owner}</span>
            </div>
            <p className="text-sm font-semibold text-white">{release.summary}</p>
            {release.artifact && <p className="text-xs text-[var(--color-slate)]">Artifact: {release.artifact}</p>}
            {release.notes && <p className="text-xs text-white/70">{release.notes}</p>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--color-slate)]">Discord payload: /api/alerts → release</p>
    </div>
  );
}

function AutomationPanel({ events }: { events: AutomationEvent[] }) {
  return (
    <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 space-y-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Automation</p>
          <h3 className="text-2xl font-semibold">Activity Log</h3>
        </div>
        <span className="text-xs text-[var(--color-slate)]">Channel + status</span>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs text-[var(--color-slate)]">
              <span>{formatTime(event.timestamp)}</span>
              <span>{event.channel}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{event.summary}</p>
              <span className="text-xs px-3 py-1 rounded-full border border-white/15 text-white/80">{event.status}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--color-slate)]">Discord payload: /api/alerts → automation</p>
    </div>
  );
}


export default function Page() {
  const status = loadStatus() as StatusPayload;
  const vector = loadVector() as VectorPayload;
  const releases = loadLiveDeployments();
  const automationEvents = loadLiveAutomation();
  const actionHistory = loadActionHistory();
  const activity = status.activity;
  const highlights = computeHighlights(status, automationEvents);
  const liveVectorMap = status.__live?.vectorMap ?? vector.map;
  const liveVectorQueue = status.__live?.vectorQueue ?? vector.queue;
  const heroMetrics = [
    { label: "Ops Tempo", value: highlights[0].value, detail: highlights[0].detail },
    { label: "System Signals", value: highlights[1].value, detail: highlights[1].detail },
    { label: "Automation Runs", value: highlights[2].value, detail: highlights[2].detail },
    { label: "Activity", value: `${activity.length}`, detail: "events logged" }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)]/70 p-6 space-y-5 shadow-panel">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.6em] text-[var(--color-slate)]">Damascus Ops</p>
            <h1 className="text-3xl font-semibold">Mission Control</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-slate)]">
            <span className="rounded-full border accent-border bg-white/5 px-3 py-1 text-[var(--color-accent)]">SYSTEM READY</span>
            <span>EST {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>Node gateway</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-[var(--color-accent)] transition">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {heroMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border accent-border bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">{metric.label}</p>
              <p className="text-3xl font-semibold text-white">{metric.value}</p>
              <p className="text-sm text-white/70">{metric.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 glass-card rounded-3xl border border-white/10 p-6">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">War Room</p>
          <h2 className="text-4xl font-semibold mt-2">Command Overview</h2>
          <p className="text-white/60 mt-3 max-w-2xl">
            Monitor ops tempo, threat signals, and automation health at a glance.
          </p>
          <div className="grid gap-4 mt-6 sm:grid-cols-3">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 glass-card p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.label}</p>
                <p className={`text-3xl font-semibold mt-1 ${highlightAccents[item.label] ?? "text-white"}`}>{item.value}</p>
                <p className="text-sm text-white/60">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 flex flex-col justify-between shadow-panel">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Priority</p>
            <h3 className="text-2xl font-semibold mt-2">Mission 001</h3>
            <p className="text-white/70 mt-2">Roofing Lead Engine ready for data ingest + scoring today.</p>
          </div>
          <div className="mt-4 space-y-2 text-sm text-white/80">
            {[
              "Finalize War Room deploy",
              "Automate Morning Brief + Discord logs",
              "Deliver lead batch"
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]"></span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 lg:col-span-2 shadow-panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Ops Feed</p>
              <h3 className="text-2xl font-semibold">Live Activity</h3>
            </div>
            <div className="text-sm text-[var(--color-slate)]">Eastern Time</div>
          </div>
          <div className="mt-4 space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="text-[var(--color-slate)] text-sm w-16">{formatTime(item.timestamp)}</div>
                <div className="flex-1 border-b border-white/10 pb-3 text-white/80">
                  <p className="font-medium">{item.summary}</p>
                  <p className="text-xs text-[var(--color-slate)]">{item.owner}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border accent-border bg-[var(--color-panel)]/70 p-6 space-y-4 shadow-panel">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--color-slate)]">Quick Actions</p>
          <QuickActions actions={actions} history={actionHistory} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <StatusPanel title="Build Status" items={status.build} staleAfterMinutes={60} />
          <StatusPanel title="Runtime Status" items={status.runtime} staleAfterMinutes={15} />
        </div>
        <ModuleMapPanel entries={liveVectorMap} />
        <div className="space-y-6">
          <QueuePanel items={liveVectorQueue} />
          <DeploymentPanel releases={releases} />
          <AutomationPanel events={automationEvents} />
        </div>
      </div>
    </div>
  );
}
