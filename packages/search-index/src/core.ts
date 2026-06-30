interface ExportPage<T> {
  continueCursor: string;
  isDone: boolean;
  page: T[];
  sourceWatermark: number;
}

interface IdentifiedRecord {
  canonicalUrl: string;
  skillId: string;
}

interface ArtifactRecord {
  artifactDigest: string;
  artifactUrl: string;
  skillId: string;
}

interface FetchArtifactsOptions<T extends ArtifactRecord> {
  concurrency: number;
  fetchArtifact: (record: T) => Promise<Uint8Array>;
  onFailure?: (record: T, error: unknown) => void;
  retries: number;
  verifyArtifact: (bytes: Uint8Array, digest: string) => Promise<void>;
}

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const collectExportRecords = async <T>(
  fetchPage: (cursor?: string) => Promise<ExportPage<T>>,
) => {
  const records: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let sourceWatermark: number | undefined;

  while (true) {
    const page = await fetchPage(cursor);
    sourceWatermark ??= page.sourceWatermark;
    if (page.sourceWatermark !== sourceWatermark) {
      throw new Error("Pagefind export source watermark changed during pagination.");
    }
    records.push(...page.page);
    if (page.isDone) {
      return { records, sourceWatermark };
    }
    if (!page.continueCursor || seenCursors.has(page.continueCursor)) {
      throw new Error("Pagefind export returned an invalid continuation cursor.");
    }
    seenCursors.add(page.continueCursor);
    cursor = page.continueCursor;
  }
};

export const assertUniqueRecords = (records: IdentifiedRecord[]) => {
  const skillIds = new Set<string>();
  const canonicalUrls = new Set<string>();
  for (const record of records) {
    if (skillIds.has(record.skillId)) {
      throw new Error(`Duplicate skill ID in Pagefind export: ${record.skillId}`);
    }
    if (canonicalUrls.has(record.canonicalUrl)) {
      throw new Error(`Duplicate canonical URL in Pagefind export: ${record.canonicalUrl}`);
    }
    skillIds.add(record.skillId);
    canonicalUrls.add(record.canonicalUrl);
  }
};

export const verifyArtifactDigest = async (bytes: Uint8Array, expectedDigest: string) => {
  const actual = `sha256:${toHex(await crypto.subtle.digest("SHA-256", bytes))}`;
  if (actual !== expectedDigest.toLowerCase()) {
    throw new Error(`Artifact digest mismatch: expected ${expectedDigest}, received ${actual}.`);
  }
};

export const createGenerationId = async (sourceWatermark: number, identityParts: string[]) => {
  const identity = `${sourceWatermark}\n${identityParts.join("\n")}`;
  const hash = toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity)));
  return `${sourceWatermark}-${hash.slice(0, 16)}`;
};

const fetchWithRetry = async <T extends ArtifactRecord>(
  record: T,
  options: FetchArtifactsOptions<T>,
) => {
  let attempt = 0;
  while (true) {
    try {
      const bytes = await options.fetchArtifact(record);
      await options.verifyArtifact(bytes, record.artifactDigest);
      return { bytes, record };
    } catch (error) {
      if (attempt >= options.retries) {
        throw error;
      }
      attempt += 1;
    }
  }
};

export const fetchArtifacts = async <T extends ArtifactRecord>(
  records: T[],
  options: FetchArtifactsOptions<T>,
) => {
  const concurrency = Math.max(1, Math.floor(options.concurrency));
  const results = Array.from<{ bytes: Uint8Array; record: T }>({ length: records.length });
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < records.length) {
      const index = nextIndex;
      nextIndex += 1;
      const record = records[index];
      if (record) {
        try {
          results[index] = await fetchWithRetry(record, options);
        } catch (error) {
          if (!options.onFailure) {
            throw error;
          }
          options.onFailure(record, error);
        }
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, records.length) }, async () => await worker()),
  );
  return results.filter((result) => result !== undefined);
};
