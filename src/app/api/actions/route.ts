import fs from "fs";
import path from "path";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import actions from "../../../data/mission-control/actions.json";
import { loadStatus } from "../../../lib/data";
import type { StatusPayload } from "../../../types/mission-control";
import { sendDiscordMessage } from "../../../lib/discord";

const workspaceRoot = path.resolve(process.cwd(), "..");
const logDir = path.join(workspaceRoot, "logs", "actions");
const projectRoot = process.cwd();
const execAsync = promisify(execCallback);
const missionLogDir = path.join(workspaceRoot, "logs", "mission-control");
const scriptsDir = path.join(projectRoot, "scripts");
const runningOnVercel = Boolean(process.env.VERCEL_URL || process.env.VERCEL);

function buildEntry(id: string) {
  const definition = actions.find((action) => action.id === id);
  if (!definition) {
    return null;
  }
  return {
    id,
    label: definition.label,
    description: definition.description,
    timestamp: new Date().toISOString()
  };
}

const actionHandlers: Record<string, () => Promise<unknown>> = {
  deploy: () => execAsync("npm run deploy:wheat", { cwd: projectRoot }),
  "system-health": () => execAsync("node scripts/system-health-post.mjs", { cwd: projectRoot }),
  "morning-brief": () => execAsync("node scripts/morning-brief.mjs", { cwd: projectRoot })
};

function appendAutomationLog(payload: Record<string, unknown>) {
  if (runningOnVercel) return;
  try {
    fs.mkdirSync(missionLogDir, { recursive: true });
    const timestamp = typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString();
    const entry = { ...payload, timestamp };
    fs.appendFileSync(path.join(missionLogDir, "automation.jsonl"), `${JSON.stringify(entry)}\n`);
  } catch (error) {
    console.warn("Failed to append automation log", error);
  }
}

async function broadcastAction(actionId: string, status: "success" | "error", details: string) {
  const messages: string[] = [];
  const timestamp = new Date().toLocaleTimeString();
  if (actionId === "deploy") {
    messages.push(`🚀 Deploy action (${timestamp}) — ${status === "success" ? "completed" : "failed"}. ${details}`);
    await sendDiscordMessage("war-room", messages[0]);
  }
  const activityMessage = `⚙️ Quick Action: ${actionId} → ${status} (${details || "no output"})`;
  await sendDiscordMessage("agent-activity", activityMessage);
  await sendDiscordMessage("automation-logs", `[QA] ${actionId} → ${status} (${timestamp}) ${details || ""}`);
}

export async function GET() {
  const history = actions.map((action) => {
    const file = path.join(logDir, `${action.id}-last.json`);
    if (!fs.existsSync(file)) return { id: action.id, label: action.label, timestamp: null };
    try {
      const payload = JSON.parse(fs.readFileSync(file, "utf8"));
      return payload;
    } catch {
      return { id: action.id, label: action.label, timestamp: null };
    }
  });
  return NextResponse.json(history, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = buildEntry(body.action);
    if (!entry) {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
    const handler = actionHandlers[body.action];
    let execResult: { stdout?: string; stderr?: string } | null = null;
    if (handler) {
      if (!runningOnVercel && fs.existsSync(scriptsDir)) {
        execResult = (await handler()) as { stdout?: string; stderr?: string };
      } else {
        execResult = await runServerlessAction(body.action);
      }
    }
    if (!runningOnVercel) {
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(path.join(logDir, "actions.log"), `${JSON.stringify(entry)}\n`);
      fs.writeFileSync(path.join(logDir, `${entry.id}-last.json`), JSON.stringify(entry, null, 2));
    }
    const execNote = execResult?.stdout?.trim() || execResult?.stderr?.trim() || "no output";
    const ranServerless = runningOnVercel && execResult?.stderr !== "Host-only quick action";
    const wasHostRun = !runningOnVercel || ranServerless;
    await broadcastAction(body.action, wasHostRun ? "success" : "error", execNote.slice(0, 300));
    if (!runningOnVercel) {
      appendAutomationLog({
        id: `qa-${entry.id}-${Date.now()}`,
        summary: entry.label,
        channel: "Quick Action",
        status: "OK",
        detail: execNote.slice(0, 120)
      });
    }
    if (ranServerless) {
      return NextResponse.json({ ok: true, entry, result: execResult?.stdout ?? "" });
    }
    if (!wasHostRun) {
      return NextResponse.json({ ok: false, entry, error: "Quick Actions must run on the host (scripts/*.mjs)." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, entry, result: execResult?.stdout ?? "" });
  } catch (error) {
    console.error("Failed to record action", error);
    await broadcastAction("system-error", "error", String(error));
    return NextResponse.json({ ok: false, error: "Unable to record action" }, { status: 500 });
  }
}

async function runServerlessAction(actionId: string) {
  switch (actionId) {
    case "system-health": {
      const status = loadStatus() as StatusPayload;
      const checks = status.__live?.systemHealth ?? [];
      const summary = checks.length
        ? checks.map((check) => `• ${check.label}: ${check.status ?? "UNKNOWN"} ${check.detail ?? ""}`).join("\n")
        : "No telemetry available.";
      await sendDiscordMessage("action-required", `**System Health (serverless)**\n${summary}`);
      return { stdout: summary };
    }
    default:
      return { stderr: "Host-only quick action" };
  }
}
