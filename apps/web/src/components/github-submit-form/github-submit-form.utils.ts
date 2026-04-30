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
