// window.prompt() throws in the production webview (the browser dialog is blocked),
// which silently broke every action that relied on it — block driver, manager override,
// broadcast, "resolved by", etc. This wrapper makes those actions safe:
//   - returns the entered text when prompt works,
//   - returns null if the user cancels (so callers can bail),
//   - returns the fallback (never null) if prompt is unavailable/throws — so the action
//     still proceeds instead of crashing.
export function safePrompt(message: string, fallback = ""): string | null {
  try {
    if (typeof window === "undefined" || typeof window.prompt !== "function") return fallback;
    return window.prompt(message, "");
  } catch {
    return fallback;
  }
}
