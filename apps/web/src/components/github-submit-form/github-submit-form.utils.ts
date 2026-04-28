import type { FetchStatus, SubmitStatus } from "./github-submit-form.types";

export function dotClass(status: FetchStatus | SubmitStatus): string {
  if (status === "fetching" || status === "submitting") {
    return "bg-muted-text animate-pulse";
  }

  if (status === "error") {
    return "bg-editorial-red";
  }

  if (status === "fetched" || status === "submitted") {
    return "bg-editorial-green";
  }

  return "bg-rule";
}

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replaceAll(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}
