const SERVER_FN_PATH_PREFIX = "/_serverFn";
const SERVER_FN_ROBOTS_TAG = "noindex, nofollow, noarchive";

export const applyCrawlerResponseHeaders = (pathname: string, response: Response): Response => {
  if (!isServerFnPath(pathname)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", SERVER_FN_ROBOTS_TAG);

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
};

const isServerFnPath = (pathname: string) =>
  pathname === SERVER_FN_PATH_PREFIX || pathname.startsWith(`${SERVER_FN_PATH_PREFIX}/`);
