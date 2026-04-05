const commands = [
  { id: "cmd-001", label: "Run camera snapshot", detail: "Triggers Insta360 capture + analysis" },
  { id: "cmd-002", label: "Post hourly digest", detail: "Send status to #command-hq" },
  { id: "cmd-003", label: "Sync mission data", detail: "Pull latest tasks/projects JSON" }
];

export default function CommandConsolePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Command Console</p>
        <h2 className="text-2xl font-semibold">Quick Actions</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {commands.map((command) => (
          <button
            key={command.id}
            className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-5 text-left hover:border-[var(--color-accent)] transition"
          >
            <p className="text-sm font-semibold text-white">{command.label}</p>
            <p className="text-xs text-white/70 mt-2">{command.detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
