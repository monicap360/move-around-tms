// Utility to concatenate class names conditionally (like clsx or tailwind-merge)
export function cn(...args: any[]): string {
  return args.filter(Boolean).join(" ");
}
