interface GithubPreviewTreeEntry {
  path: string;
  sha: string;
  size?: number;
  type: "blob" | "tree";
}

interface GithubPreviewSkill {
  files: { content: string; path: string }[];
  frontmatter: Record<string, unknown>;
  skillDescription: string;
  skillMdContent: string;
  skillMdPath: string;
  skillRootPath: string;
  skillTitle: string;
}

export interface GithubSubmitPreparedPreview {
  branch: string;
  commitDate: string | null;
  commitMessage: string | null;
  commitSha: string;
  forkCount: number | null;
  invalidSkills: {
    message: string;
    skillMdPath: string;
    skillRootPath: string;
  }[];
  licenseInfo: {
    name: string;
  } | null;
  nameWithOwner: string | null;
  owner: string;
  ownerAvatarUrl: string | null;
  ownerHandle: string;
  ownerName: string | null;
  recentCommits: {
    committedDate?: string | null;
    message?: string | null;
    sha: string;
    url?: string | null;
  }[];
  repo: string;
  repoCreatedAt: string | null;
  repoUpdatedAt: string | null;
  requestedSkillPath: string | null;
  skills: GithubPreviewSkill[];
  stargazerCount: number | null;
  tree: GithubPreviewTreeEntry[];
}

export interface PreparedGithubSkillBatchPayload {
  recentCommits: GithubSubmitPreparedPreview["recentCommits"];
  repo: {
    createdAt: number;
    defaultBranch: string;
    forks: number;
    license: string;
    nameWithOwner: string;
    owner: {
      avatarUrl?: string;
      handle: string;
      name?: string;
    };
    stars: number;
    updatedAt: number;
  };
  skills: {
    description: string;
    directoryPath: string;
    entryPath: string;
    frontmatterHash: string;
    initialSnapshot: {
      files: { content: string; path: string }[];
      sourceCommitDate: number;
      sourceCommitMessage?: string;
      sourceCommitSha: string;
      sourceCommitUrl?: string;
      sourceRef: string;
      tree: GithubPreviewTreeEntry[];
    };
    license?: string;
    preferredVersion?: string;
    slug: string;
    sourceLocator: string;
    sourceType: "github";
    skillContentHash: string;
    tags?: string[];
    title: string;
  }[];
}

const normalizeRelativePath = (value: string) => {
  const segments: string[] = [];

  for (const rawSegment of value.split("/")) {
    const segment = rawSegment.trim();
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return segments.join("/");
};

const normalizeSkillRootPath = (value: string) =>
  normalizeRelativePath(value).replace(/^\/+/, "").replace(/\/+$/, "");

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).toSorted(([left], [right]) =>
    left.localeCompare(right),
  );

  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
};

const hashTextSha256 = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const buildRootRelativeTreeEntries = (
  tree: GithubPreviewTreeEntry[],
  skillRootPath: string,
): GithubPreviewTreeEntry[] => {
  const normalizedRootPath = normalizeSkillRootPath(skillRootPath);
  const rootPrefix = normalizedRootPath.length > 0 ? `${normalizedRootPath}/` : "";

  return tree
    .filter((entry) => rootPrefix.length === 0 || entry.path.startsWith(rootPrefix))
    .map((entry) => ({
      ...entry,
      path: rootPrefix.length > 0 ? entry.path.slice(rootPrefix.length) : entry.path,
    }))
    .filter((entry) => entry.path.length > 0);
};

const chunk = <T>(items: readonly T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const DEFAULT_GITHUB_SUBMIT_BATCH_SIZE = 25;

const getPreferredVersion = (frontmatter: Record<string, unknown>) => {
  if (typeof frontmatter.metadata !== "object" || frontmatter.metadata === null) {
    return;
  }

  const { version } = frontmatter.metadata as Record<string, unknown>;
  return typeof version === "string" ? version : undefined;
};

const getSkillTags = (frontmatter: Record<string, unknown>) =>
  Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((tag): tag is string => typeof tag === "string")
    : undefined;

const getSkillLicense = (
  frontmatter: Record<string, unknown>,
  preview: GithubSubmitPreparedPreview,
) => {
  if (typeof frontmatter.license === "string") {
    return frontmatter.license;
  }

  if (typeof frontmatter.metadata === "object" && frontmatter.metadata !== null) {
    const { license } = frontmatter.metadata as Record<string, unknown>;
    if (typeof license === "string") {
      return license;
    }
  }

  return typeof preview.licenseInfo?.name === "string" ? preview.licenseInfo.name : undefined;
};

const getSourceCommitContext = (preview: GithubSubmitPreparedPreview) => ({
  sourceCommitDate:
    Date.parse(preview.commitDate ?? preview.recentCommits[0]?.committedDate ?? "") || Date.now(),
  sourceCommitMessage: preview.commitMessage ?? preview.recentCommits[0]?.message ?? undefined,
  sourceCommitUrl: preview.recentCommits[0]?.url ?? undefined,
});

const buildPreparedSkill = async (
  preview: GithubSubmitPreparedPreview,
  skill: GithubPreviewSkill,
) => {
  const normalizedSkillRootPath = normalizeSkillRootPath(skill.skillRootPath);
  const { sourceCommitDate, sourceCommitMessage, sourceCommitUrl } =
    getSourceCommitContext(preview);

  return {
    description: skill.skillDescription,
    directoryPath: normalizedSkillRootPath ? `${normalizedSkillRootPath}/` : "",
    entryPath: skill.skillMdPath,
    frontmatterHash: await hashTextSha256(stableStringify(skill.frontmatter)),
    initialSnapshot: {
      files: skill.files,
      sourceCommitDate,
      sourceCommitMessage,
      sourceCommitSha: preview.commitSha,
      sourceCommitUrl,
      sourceRef: preview.branch,
      tree: buildRootRelativeTreeEntries(preview.tree, skill.skillRootPath),
    },
    license: getSkillLicense(skill.frontmatter, preview),
    preferredVersion: getPreferredVersion(skill.frontmatter),
    slug: skill.skillTitle,
    sourceLocator: `github:${preview.owner}/${preview.repo}/${skill.skillMdPath}`,
    sourceType: "github" as const,
    skillContentHash: await hashTextSha256(skill.skillMdContent),
    tags: getSkillTags(skill.frontmatter),
    title: skill.skillTitle,
  };
};

const getFallbackLicenseFromSkills = (skills: { license?: string }[]) =>
  skills.map((skill) => skill.license?.trim()).find(Boolean);

const buildSharedPayload = (
  preview: GithubSubmitPreparedPreview,
  skills: { license?: string }[],
) => ({
  recentCommits: preview.recentCommits,
  repo: {
    createdAt: Date.parse(preview.repoCreatedAt ?? "") || Date.now(),
    defaultBranch: preview.branch,
    forks: preview.forkCount ?? 0,
    license: preview.licenseInfo?.name ?? getFallbackLicenseFromSkills(skills) ?? "Unknown",
    nameWithOwner: preview.nameWithOwner ?? `${preview.owner}/${preview.repo}`,
    owner: {
      avatarUrl: preview.ownerAvatarUrl ?? undefined,
      handle: preview.ownerHandle,
      name: preview.ownerName ?? undefined,
    },
    stars: preview.stargazerCount ?? 0,
    updatedAt: Date.parse(preview.repoUpdatedAt ?? "") || Date.now(),
  },
});

export const buildPreparedGithubSkillBatches = async (input: {
  batchSize?: number;
  preview: GithubSubmitPreparedPreview;
  selectedSkillRootPaths: string[];
}): Promise<PreparedGithubSkillBatchPayload[]> => {
  const batchSize = Math.max(1, input.batchSize ?? DEFAULT_GITHUB_SUBMIT_BATCH_SIZE);
  const selectedRootPathSet = new Set(
    input.selectedSkillRootPaths.map((skillRootPath) => normalizeSkillRootPath(skillRootPath)),
  );
  const selectedSkills = input.preview.skills.filter((skill) =>
    selectedRootPathSet.has(normalizeSkillRootPath(skill.skillRootPath)),
  );

  const preparedSkills = await Promise.all(
    selectedSkills.map(async (skill) => await buildPreparedSkill(input.preview, skill)),
  );

  return chunk(preparedSkills, batchSize).map((skills) => ({
    ...buildSharedPayload(input.preview, skills),
    skills,
  }));
};
