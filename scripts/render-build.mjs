#!/usr/bin/env node
// Cross-platform build wrapper for `next build`. Jobs:
//  1. Cap the V8 heap high enough that page-data collection on this 200+ route app
//     doesn't OOM. Build box here is the 64GB "performance" pipeline, so cap high.
//  2. CAPTURE next's output and, on failure, re-print the tail as one contiguous
//     block. Render's build-log API drops/samples lines, so a plain stream can hide
//     the real error (it did — builds exited 1 right after compile with no visible
//     reason). Reprinting the tail guarantees the actual error reaches the log.
import { spawn } from "node:child_process";
import path from "node:path";

const nextBin = path.resolve("node_modules", "next", "dist", "bin", "next");
const heapCap = "--max-old-space-size=6144";
const NODE_OPTIONS = [process.env.NODE_OPTIONS, heapCap].filter(Boolean).join(" ");

console.log(`[render-build] next build with NODE_OPTIONS="${NODE_OPTIONS}" on ${process.version}`);

const child = spawn(process.execPath, [nextBin, "build", "--webpack"], {
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

child.on("close", (code, signal) => {
  if (signal) {
    console.error(
      `\n[render-build] ❌ next build was KILLED by signal ${signal} — container OOM. ` +
        `Raise the build machine memory.`,
    );
    process.exit(1);
  }
  if (code !== 0) {
    console.error("\n[render-build] ===================================================");
    console.error("[render-build] next build FAILED — last 80 lines of its output:");
    console.error("[render-build] ===================================================");
    console.error(buf.slice(-80).join("\n"));
    console.error(`[render-build] ❌ next build exited with status ${code}.`);
    process.exit(code);
  }
  console.log("[render-build] ✓ next build succeeded.");
  process.exit(0);
});
