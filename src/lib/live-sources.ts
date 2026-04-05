import fs from "fs";
import path from "path";
import type { AutomationEvent, DeploymentEntry, DeployPayload } from "../types/mission-control";

const projectRoot = process.cwd();
const workspaceRoot = path.resolve(projectRoot, "..");
const logDir = path.join(workspaceRoot, "logs", "mission-control");
const legacyDeploymentsFile = path.join(projectRoot, "src", "data", "mission-control", "deployments.json");

function safeRead(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function readJson<T>(filePath: string): T | null {
  const raw = safeRead(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readJsonLines(filePath: string, limit = 20) {
  const raw = safeRead(filePath);
  if (!raw) return [];
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-limit);
  const entries = [] as Record<string, unknown>[];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return entries;
}

function normalizeDeployment(entry: Record<string, unknown>, idx: number): DeploymentEntry | null {
  const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : null;
  if (!timestamp) return null;
  const summary = typeof entry.summary === "string" ? entry.summary : "Release";
  const owner = typeof entry.owner === "string" ? entry.owner : "Damascus";
  const artifact = typeof entry.artifact === "string" ? entry.artifact : undefined;
  const notes = typeof entry.notes === "string" ? entry.notes : undefined;
  const id = typeof entry.id === "string" ? entry.id : `rel-live-${idx}`;
  return { id, timestamp, summary, owner, artifact, notes };
}

function normalizeAutomation(entry: Record<string, unknown>, idx: number): AutomationEvent | null {
  const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : null;
  if (!timestamp) return null;
  const summary = typeof entry.summary === "string" ? entry.summary : "Automation run";
  const channel = typeof entry.channel === "string" ? entry.channel : "Automation";
  const status = typeof entry.status === "string" ? entry.status : "OK";
  const id = typeof entry.id === "string" ? entry.id : `auto-live-${idx}`;
  return { id, timestamp, summary, channel, status };
}

export function loadLiveDeployments(limit = 12): DeploymentEntry[] {
  const jsonlPath = path.join(logDir, "releases.jsonl");
  const entries = readJsonLines(jsonlPath, limit)
    .map((entry, idx) => normalizeDeployment(entry, idx))
    .filter((entry): entry is DeploymentEntry => Boolean(entry));

  if (entries.length) {
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  const legacy = readJson<DeployPayload>(legacyDeploymentsFile);
  return legacy?.releases ?? [];
}

export function loadLiveAutomation(limit = 12): AutomationEvent[] {
  const jsonlPath = path.join(logDir, "automation.jsonl");
  const entries = readJsonLines(jsonlPath, limit)
    .map((entry, idx) => normalizeAutomation(entry, idx))
    .filter((entry): entry is AutomationEvent => Boolean(entry));

  if (entries.length) {
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  const legacy = readJson<DeployPayload>(legacyDeploymentsFile);
  return legacy?.automation ?? [];
}
