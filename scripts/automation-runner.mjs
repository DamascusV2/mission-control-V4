#!/usr/bin/env node
import { spawn } from "child_process";
import cron from "node-cron";
import path from "path";

const projectRoot = path.resolve(new URL("..", import.meta.url).pathname);

function runScript(label, command, args = []) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  child.on("exit", (code) => {
    console.log(`[${label}] exited with code ${code}`);
  });
}

cron.schedule("*/15 * * * *", () => runScript("heartbeat", "npm", ["run", "heartbeat:ping"]));
cron.schedule("0 * * * *", () => runScript("opportunity", "npm", ["run", "opportunities:push"]));
cron.schedule("0 8 * * *", () => runScript("morning-brief", "npm", ["run", "brief:run"]), {
  timezone: "America/New_York"
});

console.log("Automation runner started (heartbeat:15m, opportunities:hourly, brief:08:00 ET)");

// Keep process alive
process.stdin.resume();
