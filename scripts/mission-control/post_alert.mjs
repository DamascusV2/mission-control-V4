#!/usr/bin/env node

const ALERT_ENDPOINT = process.env.ALERT_ENDPOINT ?? "https://mission-control-v2-wheat.vercel.app/api/alerts";
const COMMAND_WEBHOOK = process.env.COMMAND_WEBHOOK;
const SYSTEM_WEBHOOK = process.env.SYSTEM_HEALTH_WEBHOOK;

if (!COMMAND_WEBHOOK && !SYSTEM_WEBHOOK) {
  console.error("Set COMMAND_WEBHOOK and/or SYSTEM_HEALTH_WEBHOOK env vars.");
  process.exit(1);
}

async function post(webhook, content) {
  if (!webhook) return;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
  if (!res.ok) {
    throw new Error(`Failed to post to ${webhook}: ${res.status} ${res.statusText}`);
  }
}

(async () => {
  const alertsRes = await fetch(ALERT_ENDPOINT);
  if (!alertsRes.ok) {
    throw new Error(`Failed to load alerts: ${alertsRes.status} ${alertsRes.statusText}`);
  }
  const payload = await alertsRes.json();
  await post(COMMAND_WEBHOOK, payload.release.content);
  await post(SYSTEM_WEBHOOK, payload.automation.content);
  console.log("Alerts dispatched.");
})();
