import { SITE_URL } from "@/lib/constants";

export function createAuthRedirectUrl(path?: string) {
  if (typeof window === "undefined") {
    return `${SITE_URL}/dashboard`;
  }

  const fallback = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const resolved = path ?? fallback;

  return new URL(resolved, SITE_URL).toString();
}
