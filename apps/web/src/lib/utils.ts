import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(
  value: number | string | Date | null | undefined,
  locale = "en",
  fallback = "Never",
) {
  if (value === null) {
    return fallback;
  }
  const d = new Date(value as number | string | Date);
  if (Number.isNaN(d.getTime())) {
    return fallback;
  }
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
