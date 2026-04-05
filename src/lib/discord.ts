const channelMap: Record<string, string | undefined> = {
  "commanders-office": process.env.COMMANDERS_OFFICE_WEBHOOK,
  "war-room": process.env.WAR_ROOM_WEBHOOK,
  "daily-intel": process.env.DAILY_INTEL_WEBHOOK,
  "lead-alerts": process.env.LEAD_ALERTS_WEBHOOK,
  "action-required": process.env.ACTION_REQUIRED_WEBHOOK ?? process.env.SYSTEM_HEALTH_WEBHOOK,
  "opportunity-scanner": process.env.OPPORTUNITY_SCANNER_WEBHOOK,
  "automation-logs": process.env.AUTOMATION_LOGS_WEBHOOK,
  "agent-activity": process.env.AGENT_ACTIVITY_WEBHOOK
};

export async function sendDiscordMessage(channel: keyof typeof channelMap, content: string) {
  const webhook = channelMap[channel];
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });
}
