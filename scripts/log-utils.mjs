import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const missionLogDir = path.join(workspaceRoot, "logs", "mission-control");

function ensureDir() {
  fs.mkdirSync(missionLogDir, { recursive: true });
}

function appendJsonLine(fileName, payload = {}) {
  ensureDir();
  const timestamp = typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString();
  const entry = {
    ...payload,
    timestamp
  };
  fs.appendFileSync(path.join(missionLogDir, fileName), `${JSON.stringify(entry)}\n`);
}

export function logRelease(payload) {
  appendJsonLine("releases.jsonl", payload);
}

export function logAutomation(payload) {
  appendJsonLine("automation.jsonl", payload);
}

export function getMissionLogDir() {
  ensureDir();
  return missionLogDir;
}
