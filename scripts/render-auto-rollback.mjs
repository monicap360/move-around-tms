/**
 * Render auto-rollback helper.
 * Requires:
 * - RENDER_API_KEY
 * - RENDER_SERVICE_ID
 * - HEALTHCHECK_URL (e.g. https://ronyx.movearoundtms.com/api/health)
 */

const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;
const healthUrl = process.env.HEALTHCHECK_URL;

if (!apiKey || !serviceId || !healthUrl) {
  console.error("Missing RENDER_API_KEY, RENDER_SERVICE_ID, or HEALTHCHECK_URL.");
  process.exit(1);
}

async function checkHealth() {
  const res = await fetch(healthUrl, { method: "GET" });
  return res.ok;
}

async function fetchDeploys() {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch deploys: ${res.status}`);
  }
  const data = await res.json();
  return data.map((entry) => entry.deploy);
}

async function rollbackTo(deployId) {
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deployId }),
  });
  if (!res.ok) {
    throw new Error(`Rollback failed: ${res.status}`);
  }
  return res.json();
}

async function main() {
  const healthy = await checkHealth();
  if (healthy) {
    console.log("Healthcheck OK. No rollback needed.");
    return;
  }

  const deploys = await fetchDeploys();
  const previous = deploys.find((d) => d.status === "live" && d.id);
  if (!previous) {
    console.error("No previous live deploy found for rollback.");
    process.exit(1);
  }

  console.log(`Rolling back to deploy ${previous.id}...`);
  await rollbackTo(previous.id);
  console.log("Rollback request submitted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
