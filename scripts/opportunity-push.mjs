#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logAutomation } from "./log-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataPath = path.join(projectRoot, "src", "data", "mission-control", "opportunities.json");

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

const webhook = process.env.OPPORTUNITY_SCANNER_WEBHOOK;
if (!webhook) {
  console.error("Missing OPPORTUNITY_SCANNER_WEBHOOK");
  process.exit(1);
}

function loadOpportunities() {
  if (!fs.existsSync(dataPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch (error) {
    console.error("Failed to parse opportunities", error);
    return [];
  }
}

function formatOpportunity(opp) {
  return `**${opp.category} · ${opp.city}**\nSignal: ${opp.signal}\nSeverity: ${opp.severity.toUpperCase()} · ETA ${opp.eta}\nValue: ${opp.value} · Owner: ${opp.owner}\nNext: ${opp.next}\nSource: ${opp.source}\nLink: ${opp.link}`;
}

async function post(content) {
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
}

(async () => {
  const opportunities = loadOpportunities();
  for (const opp of opportunities) {
    await post(formatOpportunity(opp));
  }
  logAutomation({
    id: `opportunities-${Date.now()}`,
    summary: "Opportunity scanner broadcast",
    channel: "Opportunity",
    status: "OK",
    detail: `${opportunities.length} entries pushed`
  });
  console.log(`Posted ${opportunities.length} opportunities.`);
})().catch((error) => {
  console.error("Opportunity push failed", error);
  process.exit(1);
});
