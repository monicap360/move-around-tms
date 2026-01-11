/**
 * RonYX Partner Portal - Route Helper
 * Handles automatic redirection for Veronica Butanda to her branded dashboard
 */

export function shouldRedirectToRonYX(
  userEmail: string | null | undefined,
): boolean {
  return userEmail === "melidazvl@outlook.com";
}

export function getRonYXRedirectPath(): string {
  return "/partners/ronyx";
}

export function isRonYXUser(userEmail: string | null | undefined): boolean {
  return userEmail === "melidazvl@outlook.com";
}

export const RONYX_CONFIG = {
  partner: "RonYX Logistics LLC",
  owner: "Veronica Butanda",
  email: "melidazvl@outlook.com",
  role: "partner",
  dashboard: {
    title: "RonYX Fleet Management Portal",
    subtitle: "Owner-Operator Hub",
    branding: {
      primary: "#F7931E",
      background: "#1E1E1E",
      text: "#FFFFFF",
      card: "#2A2A2A",
    },
  },
  features: [
    "Owner-Operator Management",
    "Monthly Fee Tracking",
    "Payment Processing",
    "Fleet Analytics",
    "Branded Dashboard",
  ],
} as const;
