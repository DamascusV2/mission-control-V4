#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logAutomation } from "./log-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sentinelDir = path.resolve(projectRoot, "..", "logs", "sentinel");
const logsDir = path.join(projectRoot, "logs", "notifier");
const outputDir = path.join(logsDir, "system-health");

const files = ["gateway-last.json", "cron-last.json", "webhooks-last.json"];

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    if (!key) return;
    const value = rest.join("=");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

[path.join(projectRoot, ".env.local"), path.resolve(projectRoot, "..", ".env.local")].forEach(loadEnvFile);

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function formatReport() {
  const lines = [];
  files.forEach((file) => {
    const payload = readJson(path.join(sentinelDir, file));
    if (!payload) {
      lines.push(`- ${file.replace("-last.json", "")}: no data`);
      return;
    }
    const status = payload.status ?? payload.state ?? "unknown";
    const checkedAt = payload.timestamp || payload.checked_at || payload.updated_at || "";
    const detail = payload.detail || payload.notes || "";
    lines.push(`- ${file.replace("-last.json", "")}: ${status.toUpperCase()} ${checkedAt ? `(${checkedAt})` : ""} ${detail ? `→ ${detail}` : ""}`);
  });
  return lines.join("\n");
}

function ensureDirs() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
}

async function postToDiscord(summary) {
  const webhookUrl = process.env.SYSTEM_HEALTH_WEBHOOK;
  if (!webhookUrl) return;
  const body = {
    content: `**System Health**\n${summary}`
  };
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Failed to post system health to Discord", error);
  }
}

(async function main() {
  ensureDirs();
  const reportBody = formatReport();
  const now = new Date();
  const filename = `system-health-${now.toISOString().replace(/[:.]/g, "-")}.md`;
  const fullPath = path.join(outputDir, filename);
  const content = `# System Health\nGenerated: ${now.toLocaleString()}\n\n${reportBody}\n`;
  fs.writeFileSync(fullPath, content);
  fs.appendFileSync(
    path.join(logsDir, "notifier-log.jsonl"),
    `${JSON.stringify({ timestamp: now.toISOString(), type: "system-health", file: path.join("system-health", filename) })}\n`
  );

  const shortSummary = reportBody
    .split("\n")
    .filter(Boolean)
    .map((line) => line.replace(/^- /, "• "))
    .slice(0, 4)
    .join("\n");
  await postToDiscord(shortSummary);
  logAutomation({
    id: `system-health-${now.toISOString()}`,
    summary: "System health snapshot",
    channel: "System Health",
    status: "OK",
    detail: shortSummary
  });
  console.log(`System health snapshot written to ${fullPath}`);
})();
