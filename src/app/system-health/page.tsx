import fs from "fs";
import path from "path";

type HealthCheck = {
  id: string;
  label: string;
  status: string;
  detail: string;
  timestamp?: string;
};

const fallbackChecks: HealthCheck[] = [
  { id: "firewall", label: "Firewall / Stealth", status: "PASS", detail: "Enabled 2026-03-07 14:45" },
  { id: "camera", label: "Athena Vision Stack", status: "PASS", detail: "YOLOv8 + MobileNet online" },
  { id: "cron", label: "Heartbeat + Cron", status: "WARN", detail: "Needs intel/news feed integration" },
  { id: "discord", label: "Discord HQ", status: "PASS", detail: "Channels live; automation wiring in progress" }
];

const sentinelSources = [
  { id: "gateway", label: "Gateway", file: ["logs", "sentinel", "gateway-last.json"] },
  { id: "cron", label: "Automation Heartbeat", file: ["logs", "sentinel", "cron-last.json"] },
  { id: "webhooks", label: "Discord Webhooks", file: ["logs", "sentinel", "webhooks-last.json"] },
  { id: "deploy", label: "Deploy Drift", file: ["logs", "sentinel", "deploy-last.json"] }
];

function injectSentinel(checks: HealthCheck[]): HealthCheck[] {
  for (const source of sentinelSources) {
    try {
      const filePath = path.join(process.cwd(), ...source.file);
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, "utf8");
      const payload = JSON.parse(raw);
      const sentinelCheck: HealthCheck = {
        id: payload.id ?? source.id,
        label: source.label,
        status: payload.status ?? "PASS",
        detail: payload.detail ?? "",
        timestamp: payload.timestamp
      };
      const idx = checks.findIndex((item) => item.id === sentinelCheck.id);
      if (idx >= 0) {
        checks[idx] = sentinelCheck;
      } else {
        checks.unshift(sentinelCheck);
      }
    } catch (error) {
      console.warn(`Sentinel inject failed for ${source.id}`, error);
    }
  }
  return checks;
}

function loadChecks(): HealthCheck[] {
  try {
    const file = path.join(process.cwd(), "src", "data", "generated", "status.json");
    const raw = fs.readFileSync(file, "utf8");
    const payload = JSON.parse(raw);
    if (!Array.isArray(payload.systemHealth)) return fallbackChecks;

    const checks: HealthCheck[] = payload.systemHealth.map((item: Partial<HealthCheck>, index: number) => ({
      id: item.id ?? item.label ?? `check-${index}`,
      label: item.label ?? "Unnamed check",
      status: item.status ?? "PASS",
      detail: item.detail ?? "",
      timestamp: item.timestamp
    }));

    return injectSentinel(checks);
  } catch (error) {
    console.warn("System Health fallback", error);
    return fallbackChecks;
  }
}

export default function SystemHealthPage() {
  const checks = loadChecks();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Diagnostics</p>
        <h2 className="text-2xl font-semibold">System Health</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <div key={check.id} className="bg-panel rounded-2xl border border-white/5 shadow-panel p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{check.label}</p>
              <p className="text-xs text-white/50">
                {check.detail}
                {check.timestamp
                  ? ` · ${new Date(check.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    })}`
                  : ""}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-full font-semibold ${
                check.status === "PASS" ? "bg-green-400/20 text-green-300" : "bg-amber-400/20 text-amber-200"
              }`}
            >
              {check.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
