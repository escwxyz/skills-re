import { serializeSkillEvalRunEvent } from "./events";
import type { SkillEvalRunEvent } from "./events";
import { sanitizeSkillEvalLogChunk, sanitizeSkillEvalRunEvent } from "./redaction";

export interface SkillEvalR2Object {
  text(): Promise<string>;
}

export interface SkillEvalR2Bucket {
  get(key: string): Promise<SkillEvalR2Object | null>;
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
  const existing = await bucket.get(key);
  const existingText = existing ? await existing.text() : "";
  await bucket.put(key, `${existingText}${chunk}`, {
    httpMetadata: {
      contentType,
    },
  });
};

export const createSkillEvalArtifactPrefix = (runId: string) =>
  `eval-runs/${safePathSegment(runId)}`;

export const readSkillEvalRunEvents = async (input: {
  afterSequence?: number;
  artifactPrefix: string;
  bucket: Pick<SkillEvalR2Bucket, "get">;
  limit?: number;
}) => {
  const key = `${trimSlashes(input.artifactPrefix)}/events.jsonl`;
  const object = await input.bucket.get(key);
  if (!object) {
    return {
      events: [],
      isDone: true,
      nextSequence: input.afterSequence ?? -1,
    };
  }

  const afterSequence = input.afterSequence ?? -1;
  const limit = input.limit ?? 100;
  const text = await object.text();
  const events = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SkillEvalRunEvent)
    .filter((event) => event.sequence > afterSequence)
    .toSorted((a, b) => a.sequence - b.sequence)
    .slice(0, limit);
  const lastSequence = events.at(-1)?.sequence ?? afterSequence;

  return {
    events,
    isDone: events.length < limit,
    nextSequence: lastSequence,
  };
};

export const createSkillEvalR2EventWriter = (input: {
  artifactPrefix: string;
  bucket: SkillEvalR2Bucket;
}) => {
  const artifactPrefix = trimSlashes(input.artifactPrefix);
  const keyFor = (suffix: string) => `${artifactPrefix}/${suffix}`;

  return {
    appendEvent(event: SkillEvalRunEvent) {
      return appendTextObject(
        input.bucket,
        keyFor("events.jsonl"),
        serializeSkillEvalRunEvent(sanitizeSkillEvalRunEvent(event)),
        "application/x-ndjson; charset=utf-8",
      );
    },

    appendStderr(chunk: string) {
      return appendTextObject(
        input.bucket,
        keyFor("stderr.log"),
        sanitizeSkillEvalLogChunk(chunk).text,
        "text/plain; charset=utf-8",
      );
    },

    appendStdout(chunk: string) {
      return appendTextObject(
        input.bucket,
        keyFor("stdout.log"),
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
