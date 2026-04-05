#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");

const sourceFile = path.join(projectRoot, "src", "data", "mission-control", "vector.json");
const targetDir = path.join(workspaceRoot, "logs", "mission-control");
const targetFile = path.join(targetDir, "vector.json");

function withFreshTimestamps(entries) {
  const now = new Date().toISOString();
  return entries.map((entry) => ({
    ...entry,
    updated: entry.updated ?? now
  }));
}

function main() {
  if (!fs.existsSync(sourceFile)) {
    console.error(`Source vector file missing: ${sourceFile}`);
    process.exit(1);
  }
  const payload = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
  const vectorPayload = {
    map: withFreshTimestamps(payload.map ?? []),
    queue: withFreshTimestamps(payload.queue ?? [])
  };

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, JSON.stringify(vectorPayload, null, 2));
  console.log(`Vector log refreshed → ${targetFile}`);
}

main();
