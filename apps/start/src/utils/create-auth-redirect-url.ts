import { SITE_URL } from "@/lib/constants";

export function createAuthRedirectUrl(path?: string) {
  const baseUrl = new URL(SITE_URL);

  if (typeof window === "undefined") {
    return new URL("/dashboard", baseUrl).toString();
  }

  const fallback = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const resolved = path ?? fallback;
  const targetUrl = new URL(resolved, baseUrl);

  if (targetUrl.origin !== baseUrl.origin) {
    return new URL("/dashboard", baseUrl).toString();
  }

  return targetUrl.toString();
}
