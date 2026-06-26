#!/usr/bin/env node
// Cross-platform build wrapper for `next build`. Jobs:
//  1. Cap the V8 heap high enough that page-data collection on this 200+ route app
//     doesn't OOM. Build box here is the 64GB "performance" pipeline, so cap high.
//  2. CAPTURE next's output and, on failure, re-print the tail as one contiguous
//     block. Render's build-log API drops/samples lines, so a plain stream can hide
//     the real error (it did — builds exited 1 right after compile with no visible
//     reason). Reprinting the tail guarantees the actual error reaches the log.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

console.log(`[render-build] container: ${(os.totalmem() / 1e9).toFixed(1)}GB RAM, ${os.cpus().length} CPUs, node ${process.version}, platform ${process.platform}`);

// Pre-check: does the native `sharp` binary load on THIS platform? A silent build
// crash (worker dies with no JS error) is classically a sharp glibc/musl segfault.
const sc = spawnSync(process.execPath, ["-e", "require('sharp');process.stdout.write('ok')"], { encoding: "utf8" });
const sharpStatus = sc.signal
  ? `CRASH signal=${sc.signal}`
  : sc.status !== 0
    ? `FAIL status=${sc.status} :: ${(sc.stderr || "").replace(/\s+/g, " ").slice(0, 300)}`
    : "ok";
console.log(`[render-build] sharp load check: ${sharpStatus}`);

const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
const heapCap = "--max-old-space-size=6144";
const NODE_OPTIONS = [process.env.NODE_OPTIONS, heapCap, "--trace-uncaught", "--trace-warnings"].filter(Boolean).join(" ");

console.log(`[render-build] next build with NODE_OPTIONS="${NODE_OPTIONS}" on ${process.version}`);

// Use Next 16's default Turbopack build (NOT --webpack). The webpack build crashes
// silently on Render Linux during page-data collection; Turbopack is a different engine.
const child = spawn(process.execPath, [nextBin, "build"], {
  env: { ...process.env, NODE_OPTIONS },
});

// Stream live AND keep a rolling buffer of the last ~500 lines.
let buf = [];
const tee = (chunk) => {
  const s = chunk.toString();
  process.stdout.write(s);
  for (const line of s.split("\n")) buf.push(line);
  if (buf.length > 500) buf = buf.slice(-500);
};
child.stdout.on("data", tee);
child.stderr.on("data", tee);

// Render's build-log API samples/drops lines, which hid the real failure. Ship the
// captured output straight to Supabase (build_debug_log) so it can be read back in full.
async function ship(status) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("[render-build] (no supabase env — cannot ship log)"); return; }
  try {
    const r = await fetch(`${url}/rest/v1/build_debug_log`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ status, commit: process.env.RENDER_GIT_COMMIT || null, content: buf.slice(-300).join("\n") }),
    });
    console.error(`[render-build] shipped build log to db (status ${r.status})`);
  } catch (e) { console.error("[render-build] ship failed:", e.message); }
}

child.on("close", async (code, signal) => {
  if (signal) {
    console.error(`\n[render-build] ❌ next build was KILLED by signal ${signal} — container OOM.`);
    await ship(`signal:${signal}`);
    process.exit(1);
  }
  if (code !== 0) {
    console.error("\n[render-build] ===================================================");
    console.error("[render-build] next build FAILED — last 80 lines of its output:");
    console.error("[render-build] ===================================================");
    console.error(buf.slice(-80).join("\n"));
    console.error(`[render-build] ❌ next build exited with status ${code}.`);
    await ship(`exit:${code}`);
    process.exit(code);
  }
  console.log("[render-build] ✓ next build succeeded.");
  await ship("success");
  process.exit(0);
});
