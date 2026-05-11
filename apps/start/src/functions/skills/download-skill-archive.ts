import { createServerFn } from "@tanstack/react-start";
import { env } from "@skills-re/env/start";
import { fetchBackendResponse } from "@/lib/backend-api.server";

export const downloadSkillArchive = createServerFn({ method: "POST" })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }

    const snapshotId = data.get("snapshotId")?.toString().trim();
    if (!snapshotId) {
      throw new Error("snapshotId is required");
    }

    return { snapshotId };
  })
  .handler(
    async ({ data }) =>
      await fetchBackendResponse({
        backendOrigin: env.VITE_SERVER_URL,
        path: `/skills/download?snapshotId=${encodeURIComponent(data.snapshotId)}`,
      }),
  );
