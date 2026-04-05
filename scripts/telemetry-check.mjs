#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const sentinelDir = path.join(workspaceRoot, "logs", "sentinel");

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`Failed to parse ${file}: ${error.message}`);
    return null;
  }
}

function checkSentinel(name, maxAgeMinutes = 30) {
  const file = path.join(sentinelDir, `${name}-last.json`);
  if (!fs.existsSync(file)) {
    fail(`Missing sentinel file: ${file}`);
    return;
  }
  const payload = readJson(file);
  if (!payload) return;
  const ts = payload.timestamp || payload.checked_at || payload.updated_at;
  if (!ts) {
    warn(`Sentinel ${name} missing timestamp`);
    return;
  }
  const ageMinutes = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
  if (ageMinutes > maxAgeMinutes) {
    fail(`Sentinel ${name} is stale (${ageMinutes}m > ${maxAgeMinutes}m)`);
  }
}

function checkLogFile(label, relativePath, maxAgeMinutes = 360, requireContent = false) {
  const file = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(file)) {
    fail(`Missing ${label} log: ${relativePath}`);
    return;
  }
  const stats = fs.statSync(file);
  const ageMinutes = Math.round((Date.now() - stats.mtimeMs) / 60000);
  if (ageMinutes > maxAgeMinutes) {
    warn(`${label} log is old (${ageMinutes}m)`);
  }
  if (requireContent) {
    const size = stats.size;
    if (size === 0) {
      warn(`${label} log has no entries yet`);
    }
  }
}

function main() {
  checkSentinel("gateway", 30);
  checkSentinel("cron", 30);
  checkSentinel("webhooks", 30);
  checkSentinel("deploy", 60);

  checkLogFile("Automation", "logs/mission-control/automation.jsonl", 240, false);
  checkLogFile("Release", "logs/mission-control/releases.jsonl", 1440, false);

  if (errors.length) {
    console.error("Telemetry check FAILED:\n" + errors.map((e) => ` - ${e}`).join("\n"));
    if (warnings.length) {
      console.warn("Warnings:\n" + warnings.map((w) => ` - ${w}`).join("\n"));
    }
    process.exit(1);
  }

  if (warnings.length) {
    console.warn("Telemetry check passed with warnings:\n" + warnings.map((w) => ` - ${w}`).join("\n"));
  } else {
    console.log("Telemetry check passed.");
  }
}

main();
