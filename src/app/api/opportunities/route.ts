import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import opportunities from "../../../data/mission-control/opportunities.json";
import { sendDiscordMessage } from "../../../lib/discord";

export const runtime = "nodejs";

const workspaceRoot = path.resolve(process.cwd(), "..");
const logDir = path.join(workspaceRoot, "logs", "opportunity-scanner");
const outreachDir = path.join(logDir, "outreach");
const canPersistFiles = !process.env.VERCEL;

export async function GET() {
  return NextResponse.json(opportunities, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = {
      ...body,
      timestamp: new Date().toISOString()
    };
    if (canPersistFiles) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(path.join(logDir, "actions.log"), `${JSON.stringify(entry)}\n`);
      } catch (error) {
        console.warn("Unable to persist opportunity action log", error);
      }
    }
    if (entry.action === "outreach" && entry.payload) {
      if (canPersistFiles) {
        try {
          fs.mkdirSync(outreachDir, { recursive: true });
          const fileName = `${entry.id ?? entry.payload.id ?? "opportunity"}-${Date.now()}.md`;
          const filePath = path.join(outreachDir, fileName);
          fs.writeFileSync(filePath, buildOutreachMemo(entry.payload));
        } catch (error) {
          console.warn("Unable to write outreach memo", error);
        }
      }
      try {
        await sendDiscordMessage("lead-alerts", buildDiscordSummary(entry.payload));
      } catch (error) {
        console.warn("Failed to send outreach Discord payload", error);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to record opportunity action", error);
    const message = error instanceof Error ? error.message : "Unable to record action";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

type OutreachPayload = {
  city?: string;
  category?: string;
  signal?: string;
  severity?: string;
  owner?: string;
  source?: string;
  link?: string;
  value?: string;
  next?: string;
  notes?: string;
};

function buildDiscordSummary(payload: OutreachPayload) {
  const header = `📡 Opportunity: ${payload.city ?? payload.category ?? "Unknown"}`;
  const lines = [
    `Severity: ${payload.severity ?? "n/a"}`,
    payload.signal ? `Signal: ${payload.signal}` : null,
    payload.next ? `Next: ${payload.next}` : null,
    payload.source ? `Source: ${payload.source}` : null,
    payload.link ? `Link: ${payload.link}` : null
  ]
    .filter(Boolean)
    .join("\n");
  return `${header}\n${lines}`;
}

function buildOutreachMemo(payload: OutreachPayload) {
  return [`# Outreach Pack`, `City: ${payload.city ?? "n/a"}`, `Category: ${payload.category ?? "n/a"}`, `Severity: ${payload.severity ?? "n/a"}`, "", payload.signal ? `**Signal**\n${payload.signal}` : null, payload.next ? `**Next**\n${payload.next}` : null, payload.notes ? `**Notes**\n${payload.notes}` : null, payload.link ? `**Link**\n${payload.link}` : null]
    .filter(Boolean)
    .join("\n\n");
}
