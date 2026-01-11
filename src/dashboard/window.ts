import { TimeWindow } from "./metrics.types";

export function resolveWindow(params: {
  window?: "7d" | "30d" | "90d";
  from?: string;
  to?: string;
}): TimeWindow {
  if (params.from && params.to) {
    return {
      label: "custom",
      from: params.from,
      to: params.to,
    };
  }

  const now = new Date();
  const to = now.toISOString();
  const days = params.window === "7d" ? 7 : params.window === "90d" ? 90 : 30;
  const from = new Date(now.getTime() - days * 86400000).toISOString();

  return {
    label: params.window ?? "30d",
    from,
    to,
  };
}
