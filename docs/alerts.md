# Mission Control Alert Payloads

- **Endpoint:** `/api/alerts`
- **Response:**
  ```json
  {
    "release": {
      "content": "**MISSION CONTROL DEPLOYMENT**\n• Mar 15, 07:45 PM — Module Map + Queue + vector API (Damascus)\n• ..."
    },
    "automation": {
      "content": "**AUTOMATION LOG**\n• Mar 15, 08:00 PM — Hourly digest batching check [Cron • OK]\n• ..."
    }
  }
  ```
- **Usage:** post the `content` field straight into Discord (Relay/System Health channels). Update the underlying data via `src/data/mission-control/deployments.json`.

## CLI hook

Run `COMMAND_WEBHOOK=... SYSTEM_HEALTH_WEBHOOK=... node scripts/mission-control/post_alert.mjs` to push both payloads to Discord. The script fetches `/api/alerts` (override via ALERT_ENDPOINT).
