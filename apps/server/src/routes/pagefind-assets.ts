interface PagefindAssetBucket {
  get: (key: string) => Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>;
    httpEtag: string;
    httpMetadata?: { contentType?: string };
  } | null>;
}

const MANIFEST_CACHE_CONTROL = "public, max-age=60";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const setPagefindAssetCorsHeaders = (headers: Headers) => {
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Origin", "*");
};

const isSafeAssetKey = (key: string) =>
  Boolean(key) && !key.startsWith("/") && !key.split("/").includes("..");

export const createPagefindAssetResponse = async (input: {
  bucket: PagefindAssetBucket;
  key: string;
  method: "GET" | "HEAD";
}) => {
  if (!isSafeAssetKey(input.key)) {
    return Response.json({ error: "invalid-key" }, { status: 400 });
  }

  const object = await input.bucket.get(`pagefind/${input.key}`);
  if (!object) {
    const headers = new Headers();
    setPagefindAssetCorsHeaders(headers);
    return new Response("Pagefind asset not found.", { headers, status: 404 });
  }

  const headers = new Headers({
    "Cache-Control":
      input.key === "current.json" ? MANIFEST_CACHE_CONTROL : IMMUTABLE_CACHE_CONTROL,
    "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
    ETag: object.httpEtag,
  });
  setPagefindAssetCorsHeaders(headers);
  if (input.method === "HEAD") {
    return new Response(null, { headers });
  }
  return new Response(await object.arrayBuffer(), { headers });
};
