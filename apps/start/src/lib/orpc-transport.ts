const FORWARDED_HEADER_NAMES = ["authorization", "cookie"] as const;
type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const toHeaders = (value?: HeadersInit | null) => new Headers(value ?? undefined);

const mergeForwardedHeaders = (headers: Headers, incomingHeaders?: HeadersInit | null) => {
  const forwardedHeaders = toHeaders(incomingHeaders);

  for (const headerName of FORWARDED_HEADER_NAMES) {
    const value = forwardedHeaders.get(headerName);
    if (value && !headers.has(headerName)) {
      headers.set(headerName, value);
    }
  }

  return headers;
};

const createRequest = (input: RequestInfo | URL, init?: RequestInit) =>
  new Request(input, {
    ...init,
    credentials: "include",
  });

export const fetchBrowserORPCRequest = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn: FetchFunction = globalThis.fetch.bind(globalThis),
) =>
  await fetchFn(input, {
    ...init,
    credentials: "include",
  });

export interface ServerORPCTransportOptions {
  fetchFn?: FetchFunction;
  incomingHeaders?: HeadersInit | null;
  init?: RequestInit;
  input: RequestInfo | URL;
  serviceBinding?: { fetch: FetchFunction } | null;
}

export const fetchServerORPCRequest = async ({
  fetchFn = globalThis.fetch.bind(globalThis),
  incomingHeaders,
  init,
  input,
  serviceBinding,
}: ServerORPCTransportOptions) => {
  const headers = mergeForwardedHeaders(toHeaders(init?.headers), incomingHeaders);
  const request = createRequest(input, {
    ...init,
    headers,
  });

  if (serviceBinding) {
    return await serviceBinding.fetch(request);
  }

  return await fetchFn(request);
};
