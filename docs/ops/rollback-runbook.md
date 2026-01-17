# Render Rollback Runbook

This runbook supports automated or manual rollbacks using Render's API.

## Required Env Vars

- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- `HEALTHCHECK_URL` (example: `https://ronyx.movearoundtms.com/api/health`)

## Automated Rollback

Run:

```
node scripts/render-auto-rollback.mjs
```

If the health check fails, the script requests a rollback to the last live deploy.

## Manual Rollback

1. Open Render dashboard → your service → Deploys.
2. Select the previous stable deploy.
3. Click "Rollback".

## Verify

- Check `GET /api/health` returns 200.
- Verify critical pages load (`/ronyx`, `/ronyx/tickets`, `/`).
