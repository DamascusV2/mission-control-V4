import { loadDeployments } from "./data";
import type { DeployPayload } from "../types/mission-control";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  day: "2-digit",
  timeZone: "America/New_York"
});

function formatStamp(iso: string) {
  return timeFormatter.format(new Date(iso));
}

export function buildAlertPayloads() {
  const deployments = loadDeployments() as DeployPayload;
  const releaseLines = deployments.releases.slice(0, 3).map((rel) => `• ${formatStamp(rel.timestamp)} — ${rel.summary} (${rel.owner})`).join("\n");
  const automationLines = deployments.automation.slice(0, 3).map((evt) => `• ${formatStamp(evt.timestamp)} — ${evt.summary} [${evt.channel} • ${evt.status}]`).join("\n");

  return {
    release: {
      content: `**MISSION CONTROL DEPLOYMENT**\n${releaseLines}\nArtifact: ${deployments.releases[0]?.artifact ?? "n/a"}`
    },
    automation: {
      content: `**AUTOMATION LOG**\n${automationLines}`
    }
  };
}
