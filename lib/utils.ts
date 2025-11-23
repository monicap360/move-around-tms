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
<<<<<<< HEAD
export function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
=======

// lib/utils.ts
// Common helpers used throughout MoveAround TMS.

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
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
