type SnapshotStorageEnv = Pick<Env, "ARCHIVE_FILES" | "SNAPSHOT_FILES"> & {
  R2_ARCHIVE_PUBLIC_BASE_URL?: string;
  R2_PUBLIC_BASE_URL?: string;
};

const getRequiredBaseUrl = (value: string | undefined, message: string) => {
  if (!value) {
    throw new Error(message);
  }

  return value.endsWith("/") ? value : `${value}/`;
};

export const createSnapshotArchiveStorageRuntime = (env: SnapshotStorageEnv) => ({
  async getSnapshotArchiveObject(key: string) {
    return await env.ARCHIVE_FILES.get(key);
  },
  async getSnapshotArchiveStagingObject(key: string) {
    return await env.SNAPSHOT_FILES.get(key);
  },
  async getSnapshotFileObject(
    key: string,
    range?: {
      length: number;
      offset: number;
    },
  ) {
    console.error("[r2.snapshot] getSnapshotFileObject start", {
      hasPublicBaseUrl: Boolean(env.R2_PUBLIC_BASE_URL),
      key,
      range: range ?? null,
    });

    const object = await env.SNAPSHOT_FILES.get(
      key,
      range
        ? {
            range,
          }
        : undefined,
    );

    console.error("[r2.snapshot] getSnapshotFileObject done", {
      found: Boolean(object),
      hasBody: Boolean(object?.body),
      hasPublicBaseUrl: Boolean(env.R2_PUBLIC_BASE_URL),
      key,
      range: range ?? null,
      size: object?.size ?? null,
    });

    return object;
  },
  buildSnapshotFilePublicUrl(key: string) {
    const baseUrl = getRequiredBaseUrl(
      env.R2_PUBLIC_BASE_URL,
      "R2_PUBLIC_BASE_URL is missing. Required for snapshot download URLs.",
    );
    const url = new URL(key, baseUrl).toString();
    console.error("[r2.snapshot] buildSnapshotFilePublicUrl", {
      key,
      url,
    });
    return url;
  },
  async putSnapshotArchiveObject(
    key: string,
    body: ArrayBuffer | Uint8Array | string,
    contentType?: string,
  ) {
    await env.ARCHIVE_FILES.put(key, body, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  },
  async putSnapshotArchiveStagingObject(
    key: string,
    body: ArrayBuffer | Uint8Array | string,
    contentType?: string,
  ) {
    await env.SNAPSHOT_FILES.put(key, body, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  },
  async putSnapshotFileObject(key: string, body: ArrayBuffer | Uint8Array, contentType?: string) {
    await env.SNAPSHOT_FILES.put(key, body, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  },
  async deleteSnapshotFileObject(key: string) {
    await env.SNAPSHOT_FILES.delete(key);
  },
});
