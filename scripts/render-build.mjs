#!/usr/bin/env node
// Cross-platform build wrapper for `next build`. Two jobs:
//  1. Cap the V8 heap high enough that page-data collection on this 200+ route app
//     doesn't OOM (Render runs a plain `npm run build` with no NODE_OPTIONS).
//  2. Report HOW the build ended — exit code vs killed-by-signal — so we can tell
//     a code error (status 1, prints its own error) apart from a container OOM-kill
//     (SIGKILL, silent). The earlier silent "Build failed" gave us neither.
import { spawnSync } from "node:child_process";
import path from "node:path";

const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
// Render build pipeline here is the "performance" tier = 64GB RAM build machine.
// The build's page-data/static-gen phase needs ~3.5GB of V8 heap. A 3072 cap was
// THROTTLING V8 below that need -> "JavaScript heap out of memory" -> exit status 1
// (NOT a signal), which the wrapper below misread as "a code error". The build
// actually compiles + generates all pages cleanly (verified locally at 4096).
// On a 64GB box there is no container-OOM risk, so cap generously above the need.
const heapCap = "--max-old-space-size=6144";
// Preserve any externally-set NODE_OPTIONS; the last --max-old-space-size wins.
const NODE_OPTIONS = [process.env.NODE_OPTIONS, heapCap].filter(Boolean).join(" ");

console.log(`[render-build] next build with NODE_OPTIONS="${NODE_OPTIONS}"`);

const res = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS },
});

if (res.signal) {
  console.error(
    `[render-build] ❌ next build was KILLED by signal ${res.signal} — ` +
      `this is a container OOM-kill (build machine ran out of RAM). ` +
      `Raise the Render Build Pipeline tier / build machine memory.`,
  );
} else if (res.status !== 0) {
  console.error(`[render-build] ❌ next build exited with status ${res.status} (a code/build error — see output above).`);
} else {
  console.log("[render-build] ✓ next build succeeded.");
}

process.exit(res.status ?? 1);
