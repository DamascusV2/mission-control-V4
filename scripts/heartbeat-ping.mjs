#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logAutomation } from "./log-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sentinelDir = path.resolve(projectRoot, "..", "logs", "sentinel");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    if (key && !process.env[key]) {
      process.env[key] = rest.join("=");
    }
  });
}

[path.join(projectRoot, ".env.local"), path.resolve(projectRoot, "..", ".env.local")].forEach(loadEnvFile);

const automationWebhook = process.env.AUTOMATION_LOGS_WEBHOOK;
const actionWebhook = process.env.ACTION_REQUIRED_WEBHOOK ?? process.env.SYSTEM_HEALTH_WEBHOOK;

function readSentinel(file) {
  const fullPath = path.join(sentinelDir, file);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch {
    return null;
  }
}

function buildSummary() {
  const files = [
    { name: "Gateway", file: "gateway-last.json" },
    { name: "Cron", file: "cron-last.json" },
    { name: "Webhooks", file: "webhooks-last.json" }
  ];
  const summary = [];
  const alerts = [];
  files.forEach(({ name, file }) => {
    const payload = readSentinel(file);
    if (!payload) {
      summary.push(`${name}: no data`);
      return;
    }
    const status = payload.status ?? payload.state ?? "unknown";
    const detail = payload.detail || payload.notes || "";
    const line = `${name}: ${status}${detail ? ` → ${detail}` : ""}`;
    summary.push(line);
    if (status && status.toUpperCase() !== "PASS" && status.toUpperCase() !== "OK") {
      alerts.push(line);
    }
  });
  return { summary: summary.join(" \n"), alerts };
}

async function post(webhook, content) {
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
}

(async () => {
  const { summary, alerts } = buildSummary();
  const timestamp = new Date().toLocaleString();
  if (automationWebhook) {
    await post(automationWebhook, `📟 Heartbeat ${timestamp}\n${summary}`);
  }
  if (alerts.length && actionWebhook) {
    await post(actionWebhook, `⚠️ Heartbeat alert ${timestamp}\n${alerts.join(" \n")}`);
  }
  logAutomation({
    id: `heartbeat-${Date.now()}`,
    summary: "Sentinel heartbeat broadcast",
    channel: "Heartbeat",
    status: alerts.length ? "WARN" : "OK",
    detail: summary
  });
  console.log("Heartbeat ping sent.");
})().catch((error) => {
  console.error("Heartbeat ping failed", error);
  process.exit(1);
});
