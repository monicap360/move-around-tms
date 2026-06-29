// CI guard: window.prompt()/prompt() throws in the production webview and silently breaks
// uploads + actions. Use safePrompt() from @/lib/safePrompt instead. This fails the build
// if a raw prompt() is reintroduced.
import { execSync } from "node:child_process";
let hits = "";
try {
  hits = execSync(
    String.raw`grep -rnE "(^|[^.\w])prompt\(|window\.prompt\(" app --include=*.tsx --include=*.ts || true`,
    { encoding: "utf8" },
  );
} catch {}
const bad = hits.split("\n").filter((l) => l && !/safePrompt|\/\/ NO prompt|deferredPrompt/.test(l));
if (bad.length) {
  console.error("✗ Raw prompt() found — use safePrompt() from @/lib/safePrompt instead:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("✓ No raw prompt() — all input goes through safePrompt.");
