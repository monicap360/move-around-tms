// src/notifications/preferences.types.ts
export type NotificationPreference = {
  organizationId: string;
  channel: "email";
  severity: "info" | "warn" | "critical";
  enabled: boolean;
};
