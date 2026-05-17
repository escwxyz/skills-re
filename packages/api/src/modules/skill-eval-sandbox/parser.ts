import { z } from "zod";

const rawEvalCaseSchema = z.object({
  assertions: z.array(z.string()).optional(),
  expected_output: z.string().min(1),
  files: z.array(z.string()).optional(),
  id: z.union([z.string(), z.number()]),
  prompt: z.string().min(1),
  title: z.string().optional(),
});

const rawEvalSuiteSchema = z.object({
  evals: z.array(rawEvalCaseSchema),
  skill_name: z.string(),
});

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .toSorted(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
};

const sha256Hex = async (value: unknown) => {
  const data = new TextEncoder().encode(stableStringify(value));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export interface ParsedSkillEvalCase {
  assertions: string[];
  expectedOutput: string;
  fixturePaths: string[];
  id: string;
  prompt: string;
  title?: string;
}

export interface ParsedSkillEvalSuite {
  caseCount: number;
  cases: ParsedSkillEvalCase[];
  skillName: string;
}

export interface SkillEvalValidationLimits {
  maxCaseCount: number;
  maxFixtureBytes: number;
  maxFixtureCount: number;
  maxPromptBytes: number;
}

export interface SkillEvalFixtureFile {
  path: string;
  size: number;
}

export interface SkillEvalSuiteValidationResult {
  errors: string[];
  valid: boolean;
}

export const parseSkillEvalSuite = (content: string): ParsedSkillEvalSuite => {
  const parsed = rawEvalSuiteSchema.parse(JSON.parse(content));

  return {
    caseCount: parsed.evals.length,
    cases: parsed.evals.map((caseItem) => ({
      assertions: caseItem.assertions ?? [],
      expectedOutput: caseItem.expected_output,
      fixturePaths: caseItem.files ?? [],
      id: String(caseItem.id),
      prompt: caseItem.prompt,
      title: caseItem.title,
    })),
    skillName: parsed.skill_name,
  };
};

export const createSkillEvalCaseFingerprint = (input: {
  caseItem: ParsedSkillEvalCase;
  snapshotId: string;
  snapshotVersion: string;
}) =>
  sha256Hex({
    caseItem: input.caseItem,
    snapshotId: input.snapshotId,
    snapshotVersion: input.snapshotVersion,
  });

export const createSkillEvalSuiteFingerprint = (input: {
  snapshotId: string;
  snapshotVersion: string;
  suite: ParsedSkillEvalSuite;
}) =>
  sha256Hex({
    snapshotId: input.snapshotId,
    snapshotVersion: input.snapshotVersion,
    suite: input.suite,
  });

const utf8ByteLength = (value: string) => new TextEncoder().encode(value).byteLength;

export const validateSkillEvalSuite = (input: {
  files: SkillEvalFixtureFile[];
  limits: SkillEvalValidationLimits;
  suite: ParsedSkillEvalSuite;
}): SkillEvalSuiteValidationResult => {
  const errors: string[] = [];
  const fileByPath = new Map(input.files.map((file) => [file.path, file]));

  if (input.suite.cases.length > input.limits.maxCaseCount) {
    errors.push(
      `eval suite has ${input.suite.cases.length} cases, exceeding the limit of ${input.limits.maxCaseCount}`,
    );
  }

  const seenCaseIds = new Set<string>();
  const duplicateCaseIds = new Set<string>();

  for (const caseItem of input.suite.cases) {
    if (seenCaseIds.has(caseItem.id) && !duplicateCaseIds.has(caseItem.id)) {
      duplicateCaseIds.add(caseItem.id);
      errors.push(`duplicate eval case id: ${caseItem.id}`);
    }
    seenCaseIds.add(caseItem.id);

    if (caseItem.fixturePaths.length > input.limits.maxFixtureCount) {
      errors.push(
        `eval case ${caseItem.id} references ${caseItem.fixturePaths.length} fixtures, exceeding the limit of ${input.limits.maxFixtureCount}`,
      );
    }

    for (const fixturePath of caseItem.fixturePaths) {
      const file = fileByPath.get(fixturePath);
      if (!file) {
        errors.push(`eval case ${caseItem.id} fixture is missing: ${fixturePath}`);
        continue;
      }

      if (file.size > input.limits.maxFixtureBytes) {
        errors.push(
          `eval case ${caseItem.id} fixture ${fixturePath} is ${file.size} bytes, exceeding the limit of ${input.limits.maxFixtureBytes}`,
        );
      }
    }

    const promptBytes = utf8ByteLength(caseItem.prompt);
    if (promptBytes > input.limits.maxPromptBytes) {
      errors.push(
        `eval case ${caseItem.id} prompt is ${promptBytes} bytes, exceeding the limit of ${input.limits.maxPromptBytes}`,
      );
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
};
