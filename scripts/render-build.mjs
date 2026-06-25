#!/usr/bin/env node
// Cross-platform build wrapper. Forces a high V8 heap cap for `next build` so the
// Render build — which runs a plain `npm install; npm run build` with NO
// NODE_OPTIONS — does not OOM during "Collecting page data" on this large app
// (200+ routes). The build COMPILES fine on default heap, then runs out of memory
// in page-data collection -> exit 1 after "Compiled successfully". Setting the cap
// here fixes it regardless of the Render dashboard env. Works on Windows + Linux.
import { spawnSync } from "node:child_process";
import path from "node:path";

const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
const heapCap = "--max-old-space-size=4096";
// Preserve any externally-set NODE_OPTIONS; the last --max-old-space-size wins.
const NODE_OPTIONS = [process.env.NODE_OPTIONS, heapCap].filter(Boolean).join(" ");

const res = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS },
});

process.exit(res.status ?? 1);
