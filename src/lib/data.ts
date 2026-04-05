import fs from "fs";
import path from "path";
import type { ActivityEntry, LiveStatusPayload, LiveSystemCheck, ModuleStatus } from "../types/mission-control";
import actions from "../data/mission-control/actions.json";

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, "src", "data", "mission-control");
const workspaceRoot = path.resolve(projectRoot, "..");
const logsDir = path.join(workspaceRoot, "logs");
const sentinelDir = path.join(logsDir, "sentinel");
const leadTrackerPath = path.join(workspaceRoot, "leads", "shine-and-shield", "lead-tracker.csv");
const rosterPath = path.join(workspaceRoot, "lead-intel", "facebook-city-roster.md");
const actionsLogDir = path.join(workspaceRoot, "logs", "actions");

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function safeRead(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function safeReadJson(filePath: string) {
  const raw = safeRead(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type LeadCsvRecord = Record<string, string | number | null | undefined>;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\"" && line[i + 1] === "\"") {
      current += "\"";
      i += 1;
      continue;
    }
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeDate(value?: string) {
  if (!value) return { iso: null, ts: null };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { iso: null, ts: null };
  }
  return { iso: parsed.toISOString(), ts: parsed.getTime() };
}

function parseLeadTrackerCsv(): LeadCsvRecord[] {
  if (!fs.existsSync(leadTrackerPath)) return [];
  const raw = safeRead(leadTrackerPath);
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1);

  const records: LeadCsvRecord[] = rows
    .map((line) => parseCsvLine(line))
    .map((cells) => {
      const record: LeadCsvRecord = {};
      headers.forEach((header, idx) => {
        record[header] = cells[idx] ?? "";
      });
      const dateSource = typeof record.date_found === "string" ? record.date_found : undefined;
      const { iso, ts } = normalizeDate(dateSource);
      record.__iso = iso;
      record.__ts = ts;
      const score = Number(record.lead_score);
      record.__score = Number.isFinite(score) ? score : undefined;
      return record;
    })
    .sort((a, b) => {
      const aTs = typeof a.__ts === "number" ? a.__ts : null;
      const bTs = typeof b.__ts === "number" ? b.__ts : null;
      if (aTs !== null && bTs !== null) {
        return bTs - aTs;
      }
      if (aTs !== null) return -1;
      if (bTs !== null) return 1;
      return 0;
    });

  return records;
}

function loadSentinelChecks(): LiveSystemCheck[] {
  if (!fs.existsSync(sentinelDir)) return [];
  const sources = ["gateway", "webhooks", "cron", "deploy"];
  const checks: LiveSystemCheck[] = [];

  for (const source of sources) {
    const file = path.join(sentinelDir, `${source}-last.json`);
    const data = safeReadJson(file);
    if (!data) continue;
    checks.push({
      id: data.id ?? source,
      label: data.detail ?? source,
      status: data.status ?? "UNKNOWN",
      detail: data.detail ?? "",
      timestamp: data.timestamp ?? null
    });
  }

  return checks;
}

function sentinelChecksToRuntime(checks: LiveSystemCheck[]): ModuleStatus[] {
  return checks.map((check) => {
    const status = (check.status ?? "").toUpperCase();
    const state: ModuleStatus["state"] = status === "PASS" ? "Live" : status === "WARN" ? "In Progress" : "Blocked";
    return {
      id: `sentinel-${check.id}`,
      name: `Sentinel · ${check.id}`,
      owner: "Sentinel",
      state,
      updated: check.timestamp ?? new Date().toISOString(),
      notes: check.detail ?? "",
      blocker: state === "Blocked" ? check.detail ?? "Attention required" : null
    };
  });
}

function buildLeadActivity(records: LeadCsvRecord[], limit = 6): ActivityEntry[] {
  return records.slice(0, limit).map((record, idx) => {
    const city = record.city || record.group_name || "Lead";
    const service = record.service_category || record.platform || "Signal";
    return {
      id: String(record.link || `lead-${idx}`),
      timestamp: String(record.__iso ?? new Date().toISOString()),
      summary: `${city}: ${service}${record.lead_score ? ` (${record.lead_score})` : ""}`,
      owner: String(record.platform || "Lead Engine")
    };
  });
}

function summarizeLeads(records: LeadCsvRecord[]) {
  const today = new Date().toISOString().slice(0, 10);
  let newToday = 0;
  let priority = 0;
  let nearMiss = 0;

  records.forEach((record) => {
    const iso = typeof record.__iso === "string" ? record.__iso : "";
    if (iso.startsWith(today)) {
      newToday += 1;
    }
    const score = typeof record.__score === "number" ? record.__score : 0;
    if (score >= 7) {
      priority += 1;
    }
    const notes = typeof record.notes === "string" ? record.notes.toLowerCase() : "";
    if (notes.includes("near")) {
      nearMiss += 1;
    }
  });

  return { newToday, priority, nearMiss };
}

export function loadLeadTracker() {
  const records = parseLeadTrackerCsv();
  const { newToday, priority, nearMiss } = summarizeLeads(records);
  const total = records.length;

  const hot = records.filter((record) => {
    const score = typeof record.__score === "number" ? record.__score : 0;
    return score >= 7;
  });
  const near = nearMiss
    ? records.filter((record) => {
        const notes = typeof record.notes === "string" ? record.notes.toLowerCase() : "";
        return notes.includes("near");
      })
    : [];
  const followUps = records.filter((record) => {
    const response = typeof record.response === "string" ? record.response.toLowerCase() : "";
    return !response || response === "pending";
  });

  const pipelines = [
    {
      id: "hot",
      name: "HOT Leads (score ≥ 7)",
      stage: "Ready",
      leads: hot.length,
      next: "Prep outreach pack"
    },
    {
      id: "near",
      name: "Near-Miss / Watch",
      stage: "Monitoring",
      leads: near.length,
      next: "Recheck group threads"
    },
    {
      id: "follow",
      name: "Follow-ups Needed",
      stage: "Follow-up",
      leads: followUps.length,
      next: "Ping homeowner or repost"
    }
  ];

  return {
    summary: {
      total,
      newToday,
      priority
    },
    pipelines,
    entries: records,
    hot,
    near,
    followUps
  };
}

type CityRosterEntry = {
  city: string;
  groups: {
    name: string;
    description: string;
    fit?: string;
    tier?: string;
    notes?: string;
  }[];
  needs: string[];
};

function parseRosterLine(line: string) {
  const nameMatch = line.match(/^- \*\*(.+?)\*\*/);
  if (!nameMatch) return null;
  const name = nameMatch[1].trim();
  const remainder = line.slice(nameMatch[0].length).replace(/^—/, "").trim();
  const segments = remainder
    .split("—")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const descriptionPart = segments[0] ?? "";
  const fitMatch = descriptionPart.match(/\(\*\*(.+?)\*\*\)/);
  const fit = fitMatch ? fitMatch[1].trim() : undefined;
  const description = descriptionPart.replace(/\(\*\*(.+?)\*\*\)/, "").trim();
  const statusPart = segments.slice(1).join(" — ");
  const tierMatch = statusPart.match(/\*(.+?)\*/);
  const tier = tierMatch ? tierMatch[1].trim() : undefined;
  const notes = statusPart.replace(/\*(.+?)\*/, "").replace(/^,/, "").trim();
  return {
    name,
    description,
    fit,
    tier,
    notes
  };
}

export function loadFacebookRoster(): CityRosterEntry[] {
  const raw = safeRead(rosterPath);
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const roster: CityRosterEntry[] = [];
  let current: CityRosterEntry | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const city = line.replace(/^## /, "").trim();
      current = { city, groups: [], needs: [] };
      roster.push(current);
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("- **Needs:**")) {
      const need = line.replace(/- \*\*Needs:\*\*/, "").trim().replace(/^[-–—]/, "").trim();
      if (need) {
        current.needs.push(need);
      }
      continue;
    }

    if (line.startsWith("- **")) {
      const parsed = parseRosterLine(line);
      if (parsed) {
        current.groups.push(parsed);
      }
    }
  }

  return roster;
}

export function loadActionHistory() {
  return actions.map((action) => {
    const file = path.join(actionsLogDir, `${action.id}-last.json`);
    if (!fs.existsSync(file)) {
      return { id: action.id, label: action.label, timestamp: null };
    }
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return { id: action.id, label: action.label, timestamp: null };
    }
  });
}

export function loadTasks() {
  const file = path.join(dataDir, "tasks.json");
  return readJson(file);
}

export function loadProjects() {
  const file = path.join(dataDir, "projects.json");
  return readJson(file);
}

export function loadTeam() {
  const file = path.join(dataDir, "team.json");
  return readJson(file);
}

export function loadOffice() {
  const file = path.join(dataDir, "office.json");
  return readJson(file);
}

export function loadStatus() {
  const file = path.join(dataDir, "status.json");
  const payload = readJson(file);

  const generated = path.join(projectRoot, "src", "data", "generated", "status.json");
  if (fs.existsSync(generated)) {
    try {
      const live = readJson(generated) as LiveStatusPayload;
      if (Array.isArray(live.activity) && live.activity.length) {
        payload.activity = live.activity;
      }
      if (Array.isArray(live.build) && live.build.length) {
        payload.build = live.build;
      }
      if (Array.isArray(live.runtime) && live.runtime.length) {
        payload.runtime = live.runtime;
      }
      payload.__live = live;
    } catch (error) {
      console.warn("Failed to merge live status payload", error);
    }
  }

  const sentinelChecks = loadSentinelChecks();
  const leadRecords = parseLeadTrackerCsv();

  const livePatch: LiveStatusPayload = payload.__live ? { ...payload.__live } : {};

  if (sentinelChecks.length) {
    const runtimeStatuses = sentinelChecksToRuntime(sentinelChecks);
    livePatch.systemHealth = sentinelChecks;
    livePatch.runtime = runtimeStatuses;
    payload.runtime = runtimeStatuses;
  }

  if (leadRecords.length) {
    const activity = buildLeadActivity(leadRecords);
    livePatch.activity = activity;
    payload.activity = activity;
  }

  if (Object.keys(livePatch).length) {
    payload.__live = livePatch;
  }

  return payload;
}

export function loadVector() {
  const file = path.join(dataDir, "vector.json");
  return readJson(file);
}

export function loadDeployments() {
  const file = path.join(dataDir, "deployments.json");
  return readJson(file);
}
