#!/usr/bin/env node
import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { logAutomation } from "./log-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const logsDir = path.join(projectRoot, "logs", "notifier");
const markdownDir = path.join(logsDir, "briefs");
const dataDir = path.join(projectRoot, "src", "data", "mission-control");
const leadTrackerPath = path.resolve(projectRoot, "..", "leads", "shine-and-shield", "lead-tracker.csv");
const opportunitiesPath = path.join(dataDir, "opportunities.json");
const vectorPath = path.join(dataDir, "vector.json");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  contents.split(/\r?\n/).forEach((line) => {
    if (!line || line.startsWith("#")) return;
    const [key, ...rest] = line.split("=");
    const value = rest.join("=");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

[path.join(projectRoot, ".env.local"), path.resolve(projectRoot, "..", ".env.local")].forEach(loadEnvFile);

const NEWS_API_KEY = process.env.NEWSAPI_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_API_KEY = process.env.ALPHAVANTAGE_API_KEY;

if (!NEWS_API_KEY || !FINNHUB_API_KEY || !ALPHA_API_KEY) {
  console.error("Missing API keys. Ensure NEWSAPI_API_KEY, FINNHUB_API_KEY, and ALPHAVANTAGE_API_KEY are set.");
  process.exit(1);
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Failed request ${url}: ${response.status} ${raw}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse JSON from ${url}: ${raw.slice(0, 200)}`);
  }
}

async function fetchNews({ query, category, pageSize = 5 }) {
  const params = new URLSearchParams({ language: "en", pageSize: String(pageSize) });
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  params.set("from", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const url = `https://newsapi.org/v2/${category ? "top-headlines" : "everything"}?${params.toString()}`;
  const data = await fetchJson(url, { "X-Api-Key": NEWS_API_KEY });
  const articles = data.articles ?? [];
  return articles.slice(0, pageSize).map((article) => ({
    title: article.title,
    source: article.source?.name,
    url: article.url,
    description: article.description ?? "",
    publishedAt: article.publishedAt
  }));
}

async function fetchFinnhubQuote(symbol, label = symbol) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
  const data = await fetchJson(url);
  return {
    symbol: label,
    current: data.c,
    change: data.d,
    percent: data.dp
  };
}

async function fetchAlphaRates() {
  const url = `https://www.alphavantage.co/query?function=TREASURY_YIELD&interval=daily&maturity=10year&apikey=${ALPHA_API_KEY}`;
  const data = await fetchJson(url);
  const latest = (data.data || [])[0];
  if (!latest) {
    return null;
  }
  return {
    date: latest.date,
    value: latest.value
  };
}

function formatNewsSection(title, items) {
  if (!items.length) return `### ${title}\n- No qualified items in last 24h.\n`;
  const list = items
    .map((item) => {
      const impact = item.description ? ` — ${item.description}` : "";
      return `- **${item.title}** (${item.source ?? "Unknown"})${impact}`;
    })
    .join("\n");
  return `### ${title}\n${list}\n`;
}

function formatMarketSection({ equities, crypto, rates }) {
  const parts = [];
  if (equities.length) {
    const text = equities
      .map((eq) => `${eq.symbol}: ${eq.current?.toFixed?.(2) ?? "?"} (${eq.percent?.toFixed?.(2) ?? "0"}%)`)
      .join(" | ");
    parts.push(`- **Stocks:** ${text}`);
  }
  if (crypto.length) {
    const text = crypto
      .map((asset) => `${asset.symbol}: ${asset.current?.toFixed?.(2) ?? "?"} (${asset.percent?.toFixed?.(2) ?? "0"}%)`)
      .join(" | ");
    parts.push(`- **Crypto:** ${text}`);
  }
  if (rates) {
    parts.push(`- **Macro/Rates:** 10Y yield ${rates.value}% as of ${rates.date}`);
  }
  return `### Market Snapshot\n${parts.join("\n") || "- Data unavailable"}\n`;
}

function loadMissionControlData() {
  const statusPath = path.join(projectRoot, "src", "data", "mission-control", "status.json");
  const deploymentsPath = path.join(projectRoot, "src", "data", "mission-control", "deployments.json");
  const status = fs.existsSync(statusPath) ? JSON.parse(fs.readFileSync(statusPath, "utf8")) : {};
  const deployments = fs.existsSync(deploymentsPath) ? JSON.parse(fs.readFileSync(deploymentsPath, "utf8")) : {};
  return { status, deployments };
}

function loadVectorData() {
  return fs.existsSync(vectorPath) ? JSON.parse(fs.readFileSync(vectorPath, "utf8")) : { map: [], queue: [] };
}

function loadOpportunities() {
  return fs.existsSync(opportunitiesPath) ? JSON.parse(fs.readFileSync(opportunitiesPath, "utf8")) : [];
}

function parseLeadTrackerCsv() {
  if (!fs.existsSync(leadTrackerPath)) return [];
  const raw = fs.readFileSync(leadTrackerPath, "utf8").trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/);
  const headers = lines.shift().split(",").map((h) => h.replace(/"/g, ""));
  return lines
    .filter(Boolean)
    .map((line) => {
      const cols = line
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((value) => value.replace(/^"|"$/g, "").replace(/""/g, '"'));
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = cols[index];
      });
      entry.lead_score = entry.lead_score ? Number(entry.lead_score) : null;
      entry.date_found = entry.date_found ? new Date(entry.date_found) : null;
      return entry;
    });
}

function categorizeTelemetry(status, now) {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const combined = [...(status.build ?? []), ...(status.runtime ?? [])];
  const result = {
    active: [],
    idle: [],
    blocked: [],
    nearCompletion: [],
    completed: [],
    warnings: []
  };

  combined.forEach((item) => {
    const label = `${item.name} (${item.owner})`;
    switch (item.state) {
      case "Live":
      case "In Progress":
        result.active.push(label);
        break;
      case "Not Started":
        result.idle.push(label);
        break;
      case "Blocked":
        result.blocked.push(label);
        result.warnings.push(`${label} → Blocker: ${item.blocker ?? "unspecified"}`);
        break;
      default:
        result.idle.push(label);
        break;
    }
    if (item.blocker && item.state !== "Blocked") {
      result.warnings.push(`${label} → Blocker: ${item.blocker}`);
    }
    const updated = item.updated ? new Date(item.updated) : null;
    if (updated && updated >= dayAgo && item.state === "In Progress") {
      result.nearCompletion.push(label);
    }
  });

  const recentActivity = (status.activity ?? []).filter((entry) => entry.timestamp && new Date(entry.timestamp) >= dayAgo);
  result.completed = recentActivity.map((entry) => `${entry.summary} (${entry.owner})`);
  return result;
}

function formatTelemetrySection(status, deployments, now) {
  const telemetry = categorizeTelemetry(status, now);
  const automationWarnings = (deployments.automation ?? [])
    .filter((entry) => entry.status && entry.status !== "OK")
    .map((entry) => `${entry.summary} (${entry.channel}) → ${entry.status}`);
  const warnings = telemetry.warnings.concat(automationWarnings);

  const lines = [
    `- **Active now:** ${telemetry.active.length ? telemetry.active.join(", ") : "None"}`,
    `- **Idle:** ${telemetry.idle.length ? telemetry.idle.join(", ") : "None"}`,
    `- **Blocked:** ${telemetry.blocked.length ? telemetry.blocked.join(", ") : "None"}`,
    `- **Near completion (updated <24h):** ${telemetry.nearCompletion.length ? telemetry.nearCompletion.join(", ") : "None"}`,
    `- **Completed in last 24h:** ${telemetry.completed.length ? telemetry.completed.join("; ") : "None"}`,
    `- **Warnings / misses:** ${warnings.length ? warnings.join("; ") : "None"}`
  ];
  return {
    markdown: `### Mission Control / Telemetry\n${lines.join("\n")}\n`,
    telemetry
  };
}

function formatWorkstreamSection(vectorData) {
  const mapEntries = vectorData.map ?? [];
  const queueEntries = vectorData.queue ?? [];
  const active = mapEntries.filter((item) => ["Live", "In Progress"].includes(item.state)).map((item) => `${item.module} (${item.owner})`);
  const paused = mapEntries.filter((item) => item.state === "Blocked").map((item) => `${item.module} (${item.owner})`);
  const completed = mapEntries.filter((item) => item.state === "Live").map((item) => item.module);
  const nextUp = queueEntries.filter((item) => item.state !== "Live").map((item) => `${item.title} (${item.owner})`);
  const blockers = mapEntries
    .filter((item) => (item.dependencies ?? []).length)
    .map((item) => `${item.module}: deps → ${item.dependencies.join(", ")}`);

  return `### Workstream Status\n- **Active:** ${active.length ? active.join(", ") : "None"}\n- **Paused/Blocked:** ${paused.length ? paused.join(", ") : "None"}\n- **Completed:** ${completed.length ? completed.join(", ") : "None"}\n- **Next Up:** ${nextUp.length ? nextUp.join(", ") : "None"}\n- **Blockers / dependencies:** ${blockers.length ? blockers.join("; ") : "None"}\n`;
}

function formatLeadSection(leads, opportunities, now) {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recent = leads.filter((lead) => lead.date_found && lead.date_found >= dayAgo);
  const hot = recent.filter((lead) => (lead.lead_score ?? 0) >= 7);
  const near = recent.filter((lead) => (lead.lead_score ?? 0) < 7);
  const newSources = [...new Set(recent.map((lead) => lead.group_name))].filter(Boolean);
  const patterns = [];
  if (recent.some((lead) => lead.summary?.toLowerCase().includes("insurance"))) {
    patterns.push("Insurance inspections driving roof wash demand");
  }
  if (recent.some((lead) => lead.summary?.toLowerCase().includes("diy"))) {
    patterns.push("DIY repair threads that need a pro follow-up");
  }

  const bestNextActions = [];
  hot.slice(0, 2).forEach((lead) => {
    bestNextActions.push(`Engage ${lead.group_name} (${lead.city}) post ASAP – ${lead.summary}`);
  });
  if (!bestNextActions.length && recent.length) {
    bestNextActions.push(`Monitor ${recent[0].group_name}: ${recent[0].summary}`);
  }

  const hotLines = hot.length
    ? hot.map((lead) => `- [${lead.group_name}](${lead.link}) — ${lead.summary}`).join("\n")
    : "- None";
  const nearLines = near.length
    ? near.map((lead) => `- [${lead.group_name}](${lead.link}) — ${lead.summary}`).join("\n")
    : "- None";

  const hotOpps = opportunities.filter((opp) => opp.severity === "hot").slice(0, 3);
  const oppLines = hotOpps.length
    ? hotOpps.map((opp) => `- ${opp.city}: ${opp.signal} → Next: ${opp.next}`).join("\n")
    : "- None";

  const markdown = `### Lead / Opportunity Intel\n**HOT leads:**\n${hotLines}\n\n**Near-miss watchlist:**\n${nearLines}\n\n**New sources (24h):** ${newSources.length ? newSources.join(", ") : "None"}\n**Patterns:** ${patterns.length ? patterns.join("; ") : "None observed"}\n**Opportunities:**\n${oppLines}\n**Best next actions:** ${bestNextActions.length ? bestNextActions.join("; ") : "Keep sweeps running"}\n`;

  return {
    markdown,
    summary: {
      hotCount: hot.length,
      nearCount: near.length,
      nextAction: bestNextActions[0] ?? null
    }
  };
}

function formatAutomationSection(deployments) {
  const releases = (deployments.releases ?? []).slice(0, 3).map((release) => `- ${release.summary} (${release.owner})`);
  const automationEvents = deployments.automation ?? [];
  const automationLines = automationEvents.length
    ? automationEvents.map((event) => `- ${event.channel}: ${event.summary} → ${event.status}`).join("\n")
    : "- None";
  return `### Automation Log\n**Deployments:**\n${releases.length ? releases.join("\n") : "- None"}\n\n**Automations / notifications:**\n${automationLines}\n`;
}

function formatPriorities(vectorData) {
  const queue = vectorData.queue ?? [];
  const upcoming = queue.filter((item) => item.state !== "Live").slice(0, 3);
  const lines = upcoming.length
    ? upcoming.map((item) => `- ${item.title} (${item.owner}) → ETA ${item.eta}`)
    : ["- Continue Facebook source sweeps", "- Finish Morning Brief automation", "- Wire Quick Actions"];
  return `### Top Priorities Today\n${lines.join("\n")}\n`;
}

function buildExecutiveSummary({ globalNews, telemetry, leadsSummary }) {
  const hotCount = leadsSummary?.hotCount ?? 0;
  const nearCount = leadsSummary?.nearCount ?? 0;
  const nextAction = leadsSummary?.nextAction ?? null;
  const external = globalNews[0] ? `External: ${globalNews[0].title}` : "External: No major shifts logged.";
  const internal = `Internal: ${telemetry.active?.length ?? 0} active modules, ${telemetry.blocked?.length ?? 0} blocked.`;
  const leadsLine = `Leads: ${hotCount} HOT / ${nearCount} near-miss in last 24h.`;
  const focus = nextAction ? `Focus: ${nextAction}` : "Focus: Finish Morning Brief + Quick Actions.";
  return `### Executive Summary\n- ${external}\n- ${internal}\n- ${leadsLine}\n- ${focus}\n`;
}

async function postDailyIntel(message) {
  const webhook = process.env.DAILY_INTEL_WEBHOOK;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message })
  });
}

async function main() {
  fs.mkdirSync(markdownDir, { recursive: true });

  const [globalNews, techNews, aiNews, openAiNews, cryptoNews, stocksNews] = await Promise.all([
    fetchNews({ category: "general", pageSize: 3 }),
    fetchNews({ category: "technology", pageSize: 3 }),
    fetchNews({ query: "\"artificial intelligence\" OR \"AI\"", pageSize: 3 }),
    fetchNews({ query: "OpenAI OR Anthropic", pageSize: 3 }),
    fetchNews({ query: "crypto OR bitcoin OR ethereum", pageSize: 3 }),
    fetchNews({ query: "stocks OR market OR fed", pageSize: 3 })
  ]);

  const [spx, ndx, btc, eth, rates] = await Promise.all([
    fetchFinnhubQuote("SPY", "SPY (S&P 500)"),
    fetchFinnhubQuote("QQQ", "QQQ (Nasdaq 100)"),
    fetchFinnhubQuote("BINANCE:BTCUSDT", "BTC/USDT"),
    fetchFinnhubQuote("BINANCE:ETHUSDT", "ETH/USDT"),
    fetchAlphaRates()
  ]);

  const marketSection = formatMarketSection({ equities: [spx, ndx], crypto: [btc, eth], rates });

  const newsSections = [
    formatNewsSection("Global Headlines", globalNews),
    formatNewsSection("Technology", techNews),
    formatNewsSection("AI", aiNews),
    formatNewsSection("OpenAI / Anthropic", openAiNews),
    formatNewsSection("Crypto", cryptoNews),
    formatNewsSection("Stocks / Macro", stocksNews)
  ].join("\n");

  const { status, deployments } = loadMissionControlData();
  const vectorData = loadVectorData();
  const opportunities = loadOpportunities();
  const leads = parseLeadTrackerCsv();
  const now = new Date();
  const coverageWindow = `${new Date(now.getTime() - 24 * 60 * 60 * 1000).toLocaleString()} → ${now.toLocaleString()}`;

  const telemetrySection = formatTelemetrySection(status, deployments, now);
  const workstreamSection = formatWorkstreamSection(vectorData);
  const leadSection = formatLeadSection(leads, opportunities, now);
  const automationSection = formatAutomationSection(deployments);
  const prioritiesSection = formatPriorities(vectorData);
  const executiveSummary = buildExecutiveSummary({
    globalNews,
    telemetry: telemetrySection.telemetry,
    leadsSummary: leadSection.summary ?? { hotCount: 0, nearCount: 0 }
  });

  const brief = `# Morning Brief\nDate: ${now.toLocaleDateString()}\nCoverage: ${coverageWindow}\n\n${newsSections}\n${marketSection}\n\n${telemetrySection.markdown}\n${workstreamSection}\n${leadSection.markdown}\n${automationSection}\n${prioritiesSection}\n${executiveSummary}\n`;

  const briefFile = `morning-brief-${now.toISOString().split("T")[0]}.md`;
  fs.writeFileSync(path.join(markdownDir, briefFile), brief);
  fs.appendFileSync(
    path.join(logsDir, "notifier-log.jsonl"),
    `${JSON.stringify({ timestamp: now.toISOString(), type: "morning-brief", briefPath: path.join("briefs", briefFile) })}\n`
  );
  const headline = globalNews[0]?.title ?? "No major headline";
  const stockDelta = spx.percent ? `${spx.percent.toFixed(2)}%` : "n/a";
  const cryptoDelta = btc.percent ? `${btc.percent.toFixed(2)}%` : "n/a";
  const discordMessage = `**Morning Brief · ${now.toLocaleDateString()}**\nHeadline: ${headline}\nStocks: SPY ${stockDelta} · Crypto: BTC ${cryptoDelta}\nArchive: ${briefFile}`;
  await postDailyIntel(discordMessage);
  logAutomation({
    id: `morning-brief-${now.toISOString()}`,
    summary: "Morning Brief generated",
    channel: "Morning Brief",
    status: "OK",
    detail: headline
  });
  console.log("Morning Brief draft generated.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
