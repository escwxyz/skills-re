import { getRequestHeaders } from "@tanstack/react-start/server";

const FORWARDED_HEADER_NAMES = ["authorization", "cookie"] as const;

const toHeaders = (value?: HeadersInit | null) => new Headers(value ?? undefined);

const getIncomingHeaders = (requestHeaders?: HeadersInit | null) => {
  if (requestHeaders) {
    return toHeaders(requestHeaders);
  }

  try {
    return getRequestHeaders();
  } catch {
    return new Headers();
  }
};

export interface BackendRequestOptions {
  backendOrigin: string;
  init?: RequestInit;
  path: string;
  requestHeaders?: HeadersInit | null;
}

export const fetchBackendResponse = async ({
  backendOrigin,
  init,
  path,
  requestHeaders,
}: BackendRequestOptions) => {
  const headers = toHeaders(init?.headers);
  const incomingHeaders = getIncomingHeaders(requestHeaders);

  for (const headerName of FORWARDED_HEADER_NAMES) {
    const value = incomingHeaders.get(headerName);
    if (value && !headers.has(headerName)) {
      headers.set(headerName, value);
    }
  }

  return await fetch(new URL(path, backendOrigin), {
    ...init,
    credentials: "include",
    headers,
  });
};

export const fetchBackendJson = async <T>({
  backendOrigin,
  init,
  path,
  requestHeaders,
}: BackendRequestOptions) => {
  const response = await fetchBackendResponse({
    backendOrigin,
    init,
    path,
    requestHeaders,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backend request failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
};
