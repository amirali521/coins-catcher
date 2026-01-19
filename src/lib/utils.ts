import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) {
    return '0';
  }
  if (num >= 1_000_000_000) {
    const formatted = (num / 1_000_000_000).toFixed(1);
    return (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'B';
  }
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1);
    return (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'M';
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1);
    return (formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted) + 'K';
  }
  return num.toLocaleString();
}
