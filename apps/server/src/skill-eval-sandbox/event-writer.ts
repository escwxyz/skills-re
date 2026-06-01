import { serializeSkillEvalRunEvent } from "./events";
import type { SkillEvalRunEvent } from "./events";
import { sanitizeSkillEvalLogChunk, sanitizeSkillEvalRunEvent } from "./redaction";

export interface SkillEvalR2Object {
  text(): Promise<string>;
}

export interface SkillEvalR2ObjectSummary {
  key: string;
}

export interface SkillEvalR2ListResult {
  cursor?: string;
  objects: SkillEvalR2ObjectSummary[];
  truncated?: boolean;
}

export interface SkillEvalR2Bucket {
  get(key: string): Promise<SkillEvalR2Object | null>;
  list?(input: { cursor?: string; prefix: string }): Promise<SkillEvalR2ListResult>;
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
      };
    },
  ): Promise<unknown>;
}

export interface SkillEvalCaseArtifactInput {
  caseId: string;
  content: ArrayBuffer | ReadableStream | string;
  contentType?: string;
  filename: string;
  mode: "baseline" | "with_skill";
}

const trimSlashes = (value: string) => value.replaceAll(/^\/+|\/+$/g, "");

const safePathSegment = (value: string) =>
  value
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replaceAll(/[^a-zA-Z0-9._-]+/g, "-").replaceAll(/^-+|-+$/g, ""))
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");

const appendTextObject = async (
  bucket: SkillEvalR2Bucket,
  key: string,
  chunk: string,
  contentType: string,
) => {
  await bucket.put(key, chunk, {
    httpMetadata: {
      contentType,
    },
  });
};

const chunkKeyFor = (key: string, sequence: number) =>
  `${key}.chunk.${String(sequence).padStart(12, "0")}`;

const isChunkKey = (key: string, baseKey: string) =>
  key === baseKey || key.startsWith(`${baseKey}.chunk.`) || key.startsWith(`${baseKey}/chunks/`);

const parseChunkSequence = (key: string, baseKey: string) => {
  if (key === baseKey) {
    return Number.NEGATIVE_INFINITY;
  }

  let suffix = "";
  if (key.startsWith(`${baseKey}.chunk.`)) {
    suffix = key.slice(`${baseKey}.chunk.`.length);
  } else if (key.startsWith(`${baseKey}/chunks/`)) {
    suffix = key.slice(`${baseKey}/chunks/`.length);
  }

  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

const readChunkedTextObjects = async (
  bucket: Pick<SkillEvalR2Bucket, "get"> & Partial<Pick<SkillEvalR2Bucket, "list">>,
  key: string,
) => {
  const texts: { sequence: number; text: string }[] = [];
  const { list } = bucket;
  const seenKeys = new Set<string>();

  if (list) {
    let cursor: string | undefined;
    do {
      const page = await list({
        cursor,
        prefix: key,
      });
      for (const object of page.objects) {
        if (!isChunkKey(object.key, key)) {
          continue;
        }
        seenKeys.add(object.key);
        const chunk = await bucket.get(object.key);
        if (chunk) {
          texts.push({
            sequence: parseChunkSequence(object.key, key),
            text: await chunk.text(),
          });
        }
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);

    if (!seenKeys.has(key)) {
      const object = await bucket.get(key);
      if (object) {
        texts.push({
          sequence: Number.NEGATIVE_INFINITY,
          text: await object.text(),
        });
      }
    }
  } else {
    const object = await bucket.get(key);
    if (object) {
      texts.push({
        sequence: Number.NEGATIVE_INFINITY,
        text: await object.text(),
      });
    }
  }

  return texts.toSorted((a, b) => a.sequence - b.sequence).map((entry) => entry.text);
};

export const createSkillEvalArtifactPrefix = (runId: string) =>
  `eval-runs/${safePathSegment(runId)}`;

export const readSkillEvalRunEvents = async (input: {
  afterSequence?: number;
  artifactPrefix: string;
  bucket: Pick<SkillEvalR2Bucket, "get"> & Partial<Pick<SkillEvalR2Bucket, "list">>;
  limit?: number;
}) => {
  const key = `${trimSlashes(input.artifactPrefix)}/events.jsonl`;
  const object = await input.bucket.get(key);
  if (!object && !("list" in input.bucket)) {
    return {
      events: [],
      isDone: true,
      nextSequence: input.afterSequence ?? -1,
      warnings: [],
    };
  }

  const afterSequence = input.afterSequence ?? -1;
  const limit = input.limit ?? 100;
  const warnings: string[] = [];
  let texts: string[] = [];
  if ("list" in input.bucket && input.bucket.list) {
    texts = await readChunkedTextObjects(input.bucket, key);
  } else if (object) {
    texts = [await object.text()];
  }
  const events: SkillEvalRunEvent[] = [];

  for (const text of texts) {
    for (const line of text.split("\n")) {
      if (!line) {
        continue;
      }

      try {
        const event = JSON.parse(line) as SkillEvalRunEvent;
        if (event.sequence > afterSequence) {
          events.push(event);
        }
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "skipped malformed event line");
      }
    }
  }

  events.sort((a, b) => a.sequence - b.sequence);
  const limitedEvents = events.slice(0, limit);
  const lastSequence = limitedEvents.at(-1)?.sequence ?? afterSequence;

  return {
    events: limitedEvents,
    isDone: limitedEvents.length < limit,
    nextSequence: lastSequence,
    warnings,
  };
};

export const createSkillEvalR2EventWriter = (input: {
  artifactPrefix: string;
  bucket: SkillEvalR2Bucket;
}) => {
  const artifactPrefix = trimSlashes(input.artifactPrefix);
  const keyFor = (suffix: string) => `${artifactPrefix}/${suffix}`;
  let stdoutSequence = 0;
  let stderrSequence = 0;

  return {
    appendEvent(event: SkillEvalRunEvent) {
      return appendTextObject(
        input.bucket,
        chunkKeyFor(keyFor("events.jsonl"), event.sequence),
        serializeSkillEvalRunEvent(sanitizeSkillEvalRunEvent(event)),
        "application/x-ndjson; charset=utf-8",
      );
    },

    appendStderr(chunk: string) {
      stderrSequence += 1;
      return appendTextObject(
        input.bucket,
        chunkKeyFor(keyFor("stderr.log"), stderrSequence),
        sanitizeSkillEvalLogChunk(chunk).text,
        "text/plain; charset=utf-8",
      );
    },

    appendStdout(chunk: string) {
      stdoutSequence += 1;
      return appendTextObject(
        input.bucket,
        chunkKeyFor(keyFor("stdout.log"), stdoutSequence),
        sanitizeSkillEvalLogChunk(chunk).text,
        "text/plain; charset=utf-8",
      );
    },

    writeCaseArtifact(artifact: SkillEvalCaseArtifactInput) {
      const key = keyFor(
        `cases/${safePathSegment(artifact.caseId)}/${artifact.mode}/${safePathSegment(artifact.filename)}`,
      );
      return input.bucket.put(key, artifact.content, {
        httpMetadata: {
          contentType: artifact.contentType,
        },
      });
    },

    writeSummary(summary: unknown) {
      return input.bucket.put(keyFor("summary.json"), JSON.stringify(summary, null, 2), {
        httpMetadata: {
          contentType: "application/json; charset=utf-8",
        },
      });
    },
  };
};
