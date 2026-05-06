import type { Locale } from "@/paraglide/runtime";

export const formatInteger = (value: number, locale?: Locale, compact?: boolean) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: compact ? 1 : undefined,
    notation: compact ? "compact" : undefined,
  }).format(value);

export const formatCompactNumber = (value: number, locale?: Locale) =>
  formatInteger(value, locale, true);

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
