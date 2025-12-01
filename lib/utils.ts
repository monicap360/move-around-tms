// Utility to join class names conditionally (Tailwind/React style)
export function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
// lib/utils.ts
// Common helper utilities used throughout the app.

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
