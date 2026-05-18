// oxlint-disable typescript/no-non-null-assertion
// oxlint-disable no-nested-ternary
/**
 * Local dev seed — populates the Miniflare D1 SQLite with representative skill data.
 * Run from the monorepo root: bun run packages/db/src/seed.ts
 * Add --reset to wipe existing seed data before inserting.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { nanoid } from "nanoid";

import * as schema from "./schema/index";
import type {
  FeedbackId,
  RepoId,
  ReviewId,
  SavedSkillId,
  SkillId,
  SnapshotId,
  StaticAuditId,
  TagId,
  UserId,
} from "./utils/id";

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------

const __dir = import.meta.dirname;
const MONOREPO_ROOT = join(__dir, "../../..");
const D1_DIR = join(MONOREPO_ROOT, ".alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject");
const SHOULD_UPLOAD_R2 = process.env.SEED_UPLOAD_R2 === "1";
const WRANGLER_LOG_PATH = join("/private/tmp", "wrangler-logs");

const sqliteFiles = readdirSync(D1_DIR).filter((f) => f.endsWith(".sqlite"));
if (sqliteFiles.length === 0) {
  console.error(
    `No SQLite file found in ${D1_DIR}.\nRun the dev server at least once first (bun run dev).`,
  );
  process.exit(1);
}

const [sqliteFile] = sqliteFiles;
if (!sqliteFile) {
  throw new Error(`No SQLite file found in ${D1_DIR}.`);
}

const dbPath = join(D1_DIR, sqliteFile);
console.log(`DB → ${dbPath}`);

const client = createClient({ url: `file://${dbPath}` });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// R2 upload (uses wrangler CLI with stored credentials)
// ---------------------------------------------------------------------------

const R2_BUCKET = "skills-re-snapshots";
const getWranglerBin = () => {
  const bunCacheDir = join(MONOREPO_ROOT, "node_modules/.bun");
  const wranglerPackageDir = readdirSync(bunCacheDir)
    .filter((entry) => entry.startsWith("wrangler@"))
    .toSorted()
    .at(-1);
  if (!wranglerPackageDir) {
    throw new Error("Could not locate a local wrangler installation.");
  }
  return join(bunCacheDir, wranglerPackageDir, "node_modules/wrangler/bin/wrangler.js");
};

const uploadToR2 = (key: string, content: string) => {
  if (!SHOULD_UPLOAD_R2) {
    return;
  }

  mkdirSync(WRANGLER_LOG_PATH, { recursive: true });
  const wranglerBin = getWranglerBin();
  const result = spawnSync(
    process.execPath,
    [
      wranglerBin,
      "r2",
      "object",
      "put",
      `${R2_BUCKET}/${key}`,
      "--pipe",
      "--content-type",
      "text/markdown; charset=utf-8",
    ],
    {
      cwd: MONOREPO_ROOT,
      encoding: "utf-8",
      env: {
        ...process.env,
        WRANGLER_LOG_PATH,
      },
      input: content,
    },
  );
  if (result.status !== 0) {
    throw new Error(`R2 upload failed for ${key}:\n${result.stderr}`);
  }
};

const generateSkillContent = (skill: SkillDef, repo: RepoDef): string =>
  [
    "---",
    `name: ${skill.title}`,
    `description: ${skill.description.split(".")[0]}.`,
    `version: ${skill.version}`,
    "license: MIT",
    "---",
    "",
    `# ${skill.title}`,
    "",
    skill.description,
    "",
    "## Usage",
    "",
    `Provide the context or input for your ${skill.category.replaceAll("-", " ")} task. ` +
      "The assistant will analyze it and deliver tailored, actionable output.",
    "",
    "## Instructions",
    "",
    `You are an expert assistant specializing in ${skill.category.replaceAll("-", " ")}.` +
      " When the user provides a task:",
    "",
    "1. Carefully analyze the requirements",
    "2. Identify the most effective approach",
    "3. Provide clear, step-by-step guidance",
    "4. Include concrete examples where helpful",
    "5. Call out edge cases and potential pitfalls",
    "",
    "## Source",
    "",
    `Repository: ${repo.nameWithOwner}`,
  ].join("\n");

const generateSkillContentForVersion = (skill: SkillDef, repo: RepoDef, version: string): string =>
  generateSkillContent(
    {
      ...skill,
      version,
    },
    repo,
  );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nid = () => nanoid() as string;
const now = Date.now();
const daysAgo = (d: number) => now - d * 86_400_000;

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

interface CategoryDef {
  slug: string;
  name: string;
  description: string;
  count: number;
}

type CategoryCountInsert = typeof schema.categoryCountsTable.$inferInsert;
type DailyMetricInsert = typeof schema.dailyMetricsTable.$inferInsert;
type FeedbackInsert = typeof schema.feedbackTable.$inferInsert;
type RepoInsert = typeof schema.reposTable.$inferInsert;
type ReviewInsert = typeof schema.reviewsTable.$inferInsert;
type SavedSkillInsert = typeof schema.savedSkillsTable.$inferInsert;
type SnapshotInsert = typeof schema.snapshotsTable.$inferInsert;
type SkillInsert = typeof schema.skillsTable.$inferInsert;
type StaticAuditInsert = typeof schema.staticAuditsTable.$inferInsert;
type TagInsert = typeof schema.tagsTable.$inferInsert;
type UserInsert = typeof schema.usersTable.$inferInsert;

const TEST_USER_ID = "test-user" as UserId;

const CATEGORIES: CategoryDef[] = [
  {
    slug: "code-craft",
    name: "Code Craft",
    description: "Prompts that help write, review, and refactor code across any language.",
    count: 10,
  },
  {
    slug: "research",
    name: "Research",
    description: "Prompts for academic research, literature review, and knowledge synthesis.",
    count: 4,
  },
  {
    slug: "writing",
    name: "Writing",
    description: "Prompts for clear technical and professional writing tasks.",
    count: 4,
  },
  {
    slug: "data",
    name: "Data",
    description: "Prompts for data analysis, transformation, and visualization workflows.",
    count: 3,
  },
  {
    slug: "browsing",
    name: "Browsing",
    description: "Prompts that assist with web research and information retrieval.",
    count: 2,
  },
  {
    slug: "ops",
    name: "Ops",
    description: "Prompts for DevOps, infrastructure, and deployment workflows.",
    count: 3,
  },
  {
    slug: "design",
    name: "Design",
    description: "Prompts for UI/UX design, system design, and architecture planning.",
    count: 2,
  },
  {
    slug: "safety",
    name: "Safety",
    description: "Prompts for security auditing, vulnerability assessment, and safe coding.",
    count: 2,
  },
];

interface TagDef {
  id: TagId;
  slug: string;
  count: number;
}

const TAGS: TagDef[] = [
  { id: nid() as TagId, slug: "typescript", count: 8 },
  { id: nid() as TagId, slug: "python", count: 7 },
  { id: nid() as TagId, slug: "javascript", count: 5 },
  { id: nid() as TagId, slug: "git", count: 5 },
  { id: nid() as TagId, slug: "testing", count: 5 },
  { id: nid() as TagId, slug: "code-review", count: 6 },
  { id: nid() as TagId, slug: "debugging", count: 4 },
  { id: nid() as TagId, slug: "refactoring", count: 4 },
  { id: nid() as TagId, slug: "documentation", count: 5 },
  { id: nid() as TagId, slug: "react", count: 3 },
  { id: nid() as TagId, slug: "docker", count: 3 },
  { id: nid() as TagId, slug: "sql", count: 3 },
  { id: nid() as TagId, slug: "api", count: 4 },
  { id: nid() as TagId, slug: "security", count: 3 },
  { id: nid() as TagId, slug: "performance", count: 3 },
  { id: nid() as TagId, slug: "llm", count: 3 },
  { id: nid() as TagId, slug: "cli", count: 3 },
  { id: nid() as TagId, slug: "data-analysis", count: 4 },
  { id: nid() as TagId, slug: "writing", count: 4 },
  { id: nid() as TagId, slug: "research", count: 4 },
];

interface RepoDef {
  id: RepoId;
  name: string;
  nameWithOwner: string;
  ownerHandle: string;
  ownerName: string;
  stars: number;
}

const REPOS: RepoDef[] = [
  {
    id: nid() as RepoId,
    name: "claude-skills",
    nameWithOwner: "anthropics-labs/claude-skills",
    ownerHandle: "anthropics-labs",
    ownerName: "Anthropic Labs",
    stars: 2431,
  },
  {
    id: nid() as RepoId,
    name: "productivity-prompts",
    nameWithOwner: "devpro/productivity-prompts",
    ownerHandle: "devpro",
    ownerName: "Dev Pro",
    stars: 854,
  },
  {
    id: nid() as RepoId,
    name: "refactoring-skills",
    nameWithOwner: "craftsman-dev/refactoring-skills",
    ownerHandle: "craftsman-dev",
    ownerName: "Craftsman Dev",
    stars: 412,
  },
  {
    id: nid() as RepoId,
    name: "analytics-prompts",
    nameWithOwner: "datacraft/analytics-prompts",
    ownerHandle: "datacraft",
    ownerName: "Data Craft",
    stars: 289,
  },
];

const tagId = (slug: string) => {
  const tag = TAGS.find((t) => t.slug === slug);
  if (!tag) {
    throw new Error(`Unknown tag slug: ${slug}`);
  }
  return tag.id;
};

interface SkillDef {
  id: SkillId;
  snapshotId: SnapshotId;
  title: string;
  slug: string;
  description: string;
  category: string;
  repoOwner: string;
  tags: string[];
  version: string;
  downloadsAllTime: number;
  downloadsTrending: number;
  viewsAllTime: number;
  createdDaysAgo: number;
  ownedByTestUser?: boolean;
  versionHistory?: {
    createdDaysAgo: number;
    description?: string;
    snapshotId: SnapshotId;
    sourceCommitUrl?: string;
    version: string;
  }[];
}

const findCategory = (slug: string) => {
  const category = CATEGORIES.find((item) => item.slug === slug);
  if (!category) {
    throw new Error(`Unknown category slug: ${slug}`);
  }
  return category;
};

const findRepo = (ownerHandle: string) => {
  const repo = REPOS.find((item) => item.ownerHandle === ownerHandle);
  if (!repo) {
    throw new Error(`Unknown repo owner handle: ${ownerHandle}`);
  }
  return repo;
};

const buildMockCommitUrl = (repo: RepoDef, skill: SkillDef, version: string) =>
  `https://github.com/${repo.ownerHandle}/${repo.name}/commit/${skill.slug}-${version}`;

const SKILLS: SkillDef[] = [
  // --- code-craft (10) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "TypeScript Type Guard Generator",
    slug: "typescript-type-guard-generator",
    description:
      "Generates runtime type guards from TypeScript interfaces, union types, and discriminated unions. Paste any type definition — from a simple object to a deeply nested conditional type — and receive a fully-typed, tree-shakeable guard function with exhaustive narrowing, optional unknown-input validation, and JSDoc comments. Supports generics, index signatures, mapped types, and template literal types. Output is compatible with strict mode and works seamlessly with libraries like Zod, io-ts, and Effect.",
    category: "code-craft",
    repoOwner: "anthropics-labs",
    tags: ["typescript", "code-review"],
    version: "1.3.0",
    downloadsAllTime: 18_420,
    downloadsTrending: 920,
    viewsAllTime: 54_000,
    createdDaysAgo: 180,
    ownedByTestUser: true,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.2.0",
        createdDaysAgo: 210,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.1.0",
        createdDaysAgo: 250,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 300,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "React Component Refactoring Assistant",
    slug: "react-component-refactoring",
    description:
      "Analyzes a React component and suggests targeted refactors: extracts custom hooks, splits oversized render trees into composable children, memoizes with useMemo and useCallback where it actually helps, and removes common anti-patterns like prop drilling, inline object creation in JSX, and stale closure bugs. Works with both class and function components, understands concurrent mode constraints, and explains each suggestion so you learn — not just copy-paste.",
    category: "code-craft",
    repoOwner: "anthropics-labs",
    tags: ["react", "refactoring", "typescript"],
    version: "2.1.0",
    downloadsAllTime: 14_900,
    downloadsTrending: 810,
    viewsAllTime: 47_200,
    createdDaysAgo: 120,
    ownedByTestUser: true,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "2.0.0",
        createdDaysAgo: 150,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.5.0",
        createdDaysAgo: 185,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Git Commit Message Writer",
    slug: "git-commit-message-writer",
    description:
      "Writes conventional commit messages from a git diff or a plain-text change summary. Respects the Conventional Commits spec, handles multi-scope changes gracefully, and optionally adds a body with motivation and breaking-change notes.",
    category: "code-craft",
    repoOwner: "devpro",
    tags: ["git", "documentation"],
    version: "1.0.2",
    downloadsAllTime: 12_100,
    downloadsTrending: 650,
    viewsAllTime: 38_900,
    createdDaysAgo: 90,
    ownedByTestUser: true,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.1",
        createdDaysAgo: 100,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 115,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Code Review Annotator",
    slug: "code-review-annotator",
    description:
      "Reviews a pull request diff and produces structured inline comments covering logic bugs, style nits, security concerns, and missing test coverage — formatted to match your team's existing PR conventions. Understands context across files, avoids flagging intentional patterns, and ranks findings by severity so reviewers know where to focus first.",
    category: "code-craft",
    repoOwner: "craftsman-dev",
    tags: ["code-review", "typescript"],
    version: "1.1.0",
    downloadsAllTime: 11_200,
    downloadsTrending: 580,
    viewsAllTime: 33_400,
    createdDaysAgo: 95,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 120,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Unit Test Case Generator",
    slug: "unit-test-case-generator",
    description:
      "Generates comprehensive unit tests for a function or class: happy paths, edge cases, and error branches. Outputs in Jest, Vitest, or pytest.",
    category: "code-craft",
    repoOwner: "anthropics-labs",
    tags: ["testing", "typescript"],
    version: "1.4.1",
    downloadsAllTime: 9800,
    downloadsTrending: 510,
    viewsAllTime: 29_100,
    createdDaysAgo: 60,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.4.0",
        createdDaysAgo: 75,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.3.0",
        createdDaysAgo: 100,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.2.0",
        createdDaysAgo: 130,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 160,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "SQL Query Optimizer",
    slug: "sql-query-optimizer",
    description:
      "Analyzes a slow SQL query and rewrites it for performance: adds indexes, rewrites correlated subqueries, fixes N+1 patterns, and explains the execution plan changes.",
    category: "code-craft",
    repoOwner: "devpro",
    tags: ["sql", "performance"],
    version: "0.9.0",
    downloadsAllTime: 8700,
    downloadsTrending: 440,
    viewsAllTime: 24_600,
    createdDaysAgo: 75,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "0.8.0",
        createdDaysAgo: 95,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "0.7.0",
        createdDaysAgo: 120,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Python Debugging Assistant",
    slug: "python-debugging-assistant",
    description:
      "Diagnoses Python stack traces and logic bugs. Explains the root cause in plain English, identifies the offending line, and proposes a minimal fix with type-safe alternatives.",
    category: "code-craft",
    repoOwner: "anthropics-labs",
    tags: ["python", "debugging"],
    version: "1.2.0",
    downloadsAllTime: 7900,
    downloadsTrending: 390,
    viewsAllTime: 22_300,
    createdDaysAgo: 110,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.1.0",
        createdDaysAgo: 135,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 165,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "API Documentation Generator",
    slug: "api-documentation-generator",
    description:
      "Generates OpenAPI-compatible documentation from source code or route handlers. Infers request/response shapes, writes human-readable descriptions, and flags missing validations.",
    category: "code-craft",
    repoOwner: "devpro",
    tags: ["api", "documentation"],
    version: "1.0.0",
    downloadsAllTime: 7100,
    downloadsTrending: 360,
    viewsAllTime: 20_800,
    createdDaysAgo: 50,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Refactoring Roadmap Planner",
    slug: "refactoring-roadmap-planner",
    description:
      "Given a messy codebase description or module listing, produces a phased refactoring plan: what to extract first, which abstractions to introduce, and how to gate each step behind tests.",
    category: "code-craft",
    repoOwner: "craftsman-dev",
    tags: ["refactoring", "code-review"],
    version: "0.8.0",
    downloadsAllTime: 6300,
    downloadsTrending: 310,
    viewsAllTime: 18_200,
    createdDaysAgo: 140,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "CLI Tool Builder",
    slug: "cli-tool-builder",
    description:
      "Scaffolds a production-ready CLI tool from a plain description: argument parsing, help text, stdin/stdout handling, and error codes. Supports Typer (Python) and Commander.js.",
    category: "code-craft",
    repoOwner: "devpro",
    tags: ["cli", "python"],
    version: "0.5.0",
    downloadsAllTime: 5400,
    downloadsTrending: 270,
    viewsAllTime: 16_100,
    createdDaysAgo: 30,
  },
  // --- research (4) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Literature Review Synthesizer",
    slug: "literature-review-synthesizer",
    description:
      "Synthesizes multiple research abstracts into a coherent literature review section: identifies themes, contrasts methodologies, and surfaces research gaps in academic prose.",
    category: "research",
    repoOwner: "anthropics-labs",
    tags: ["research", "writing"],
    version: "1.1.0",
    downloadsAllTime: 8200,
    downloadsTrending: 420,
    viewsAllTime: 23_800,
    createdDaysAgo: 85,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Research Question Generator",
    slug: "research-question-generator",
    description:
      "Turns a broad research topic into a set of focused, testable research questions. Applies PICO / FINER frameworks and suggests feasibility considerations for each question.",
    category: "research",
    repoOwner: "anthropics-labs",
    tags: ["research", "llm"],
    version: "0.9.0",
    downloadsAllTime: 5600,
    downloadsTrending: 280,
    viewsAllTime: 16_400,
    createdDaysAgo: 70,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Citation Formatter",
    slug: "citation-formatter",
    description:
      "Converts raw reference metadata into properly formatted citations. Supports APA 7, MLA 9, Chicago, IEEE, and Vancouver styles with correct italics and punctuation.",
    category: "research",
    repoOwner: "devpro",
    tags: ["research", "documentation"],
    version: "1.0.0",
    downloadsAllTime: 4900,
    downloadsTrending: 245,
    viewsAllTime: 14_100,
    createdDaysAgo: 55,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Competitive Analysis Writer",
    slug: "competitive-analysis-writer",
    description:
      "Structures a competitive analysis from a list of competitors and differentiators: feature comparison matrix, positioning narrative, and strategic takeaways for a given audience.",
    category: "research",
    repoOwner: "devpro",
    tags: ["research", "data-analysis"],
    version: "0.7.0",
    downloadsAllTime: 3800,
    downloadsTrending: 190,
    viewsAllTime: 11_200,
    createdDaysAgo: 45,
  },
  // --- writing (4) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Technical Blog Post Writer",
    slug: "technical-blog-post-writer",
    description:
      "Drafts a full technical blog post from a bullet-point outline or code snippet. Chooses the right narrative arc, code callout format, and developer-friendly tone for your audience.",
    category: "writing",
    repoOwner: "anthropics-labs",
    tags: ["writing", "documentation"],
    version: "1.2.0",
    downloadsAllTime: 9100,
    downloadsTrending: 460,
    viewsAllTime: 27_300,
    createdDaysAgo: 100,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.1.0",
        createdDaysAgo: 125,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 155,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "API Error Message Improver",
    slug: "api-error-message-improver",
    description:
      "Rewrites terse or cryptic API error messages into clear, actionable user-facing text with: what went wrong, why it happened, and exactly how to fix it.",
    category: "writing",
    repoOwner: "devpro",
    tags: ["writing", "api"],
    version: "0.8.0",
    downloadsAllTime: 6700,
    downloadsTrending: 340,
    viewsAllTime: 19_500,
    createdDaysAgo: 65,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Changelog Entry Generator",
    slug: "changelog-entry-generator",
    description:
      "Generates a keep-a-changelog entry from merged PRs or a git log. Groups changes by type (Added, Changed, Fixed), links to issues, and writes in your project voice.",
    category: "writing",
    repoOwner: "craftsman-dev",
    tags: ["writing", "git"],
    version: "1.0.0",
    downloadsAllTime: 5100,
    downloadsTrending: 255,
    viewsAllTime: 15_200,
    createdDaysAgo: 40,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "README Template Filler",
    slug: "readme-template-filler",
    description:
      "Takes a project description and codebase structure, then writes a complete README: badges, installation, quickstart, API reference stub, contribution guide, and license section.",
    category: "writing",
    repoOwner: "devpro",
    tags: ["writing", "documentation"],
    version: "1.1.0",
    downloadsAllTime: 4200,
    downloadsTrending: 210,
    viewsAllTime: 12_600,
    createdDaysAgo: 35,
  },
  // --- data (3) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Pandas Data Cleaner",
    slug: "pandas-data-cleaner",
    description:
      "Generates a pandas pipeline that cleans a messy DataFrame: drops duplicates, normalizes column names, infers types, handles nulls with a strategy you choose, and adds validation assertions.",
    category: "data",
    repoOwner: "datacraft",
    tags: ["python", "data-analysis"],
    version: "1.0.0",
    downloadsAllTime: 6900,
    downloadsTrending: 350,
    viewsAllTime: 20_100,
    createdDaysAgo: 80,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "SQL Schema Designer",
    slug: "sql-schema-designer",
    description:
      "Turns an entity-relationship description into normalized DDL: CREATE TABLE statements, foreign keys, indexes for common query patterns, and seed data for local dev.",
    category: "data",
    repoOwner: "datacraft",
    tags: ["sql", "data-analysis"],
    version: "0.9.0",
    downloadsAllTime: 5500,
    downloadsTrending: 275,
    viewsAllTime: 16_800,
    createdDaysAgo: 72,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "CSV to JSON Transformer",
    slug: "csv-to-json-transformer",
    description:
      "Writes a Python or Node.js script that converts CSV exports to structured JSON: infers schema, handles encoding quirks, maps columns, and adds optional zod/pydantic validation.",
    category: "data",
    repoOwner: "datacraft",
    tags: ["python", "data-analysis"],
    version: "0.6.0",
    downloadsAllTime: 4100,
    downloadsTrending: 205,
    viewsAllTime: 12_300,
    createdDaysAgo: 55,
  },
  // --- ops (3) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Dockerfile Optimizer",
    slug: "dockerfile-optimizer",
    description:
      "Reviews a Dockerfile and rewrites it for smaller image size, faster layer caching, and better security posture: multi-stage builds, non-root users, and pinned base images.",
    category: "ops",
    repoOwner: "devpro",
    tags: ["docker", "performance"],
    version: "1.1.0",
    downloadsAllTime: 7400,
    downloadsTrending: 375,
    viewsAllTime: 22_000,
    createdDaysAgo: 88,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "CI/CD Pipeline Debugger",
    slug: "cicd-pipeline-debugger",
    description:
      "Reads a failing GitHub Actions or GitLab CI log and diagnoses the root cause: environment mismatches, missing secrets, flaky test patterns, and cache invalidation issues.",
    category: "ops",
    repoOwner: "devpro",
    tags: ["docker", "debugging"],
    version: "0.9.0",
    downloadsAllTime: 5800,
    downloadsTrending: 290,
    viewsAllTime: 17_400,
    createdDaysAgo: 62,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Kubernetes Manifest Generator",
    slug: "kubernetes-manifest-generator",
    description:
      "Generates Kubernetes manifests for a service: Deployment, Service, HPA, ConfigMap, and optional Ingress. Follows production best practices — resource limits, liveness probes, and rolling updates.",
    category: "ops",
    repoOwner: "craftsman-dev",
    tags: ["docker", "cli"],
    version: "0.7.0",
    downloadsAllTime: 4300,
    downloadsTrending: 215,
    viewsAllTime: 12_900,
    createdDaysAgo: 48,
  },
  // --- browsing (2) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Web Scraping Script Generator",
    slug: "web-scraping-script-generator",
    description:
      "Writes a polite, production-ready web scraping script from a target URL and desired data fields. Uses Playwright or BeautifulSoup, respects robots.txt, and handles pagination.",
    category: "browsing",
    repoOwner: "devpro",
    tags: ["python", "research"],
    version: "0.8.0",
    downloadsAllTime: 5200,
    downloadsTrending: 260,
    viewsAllTime: 15_600,
    createdDaysAgo: 58,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Search Query Enhancer",
    slug: "search-query-enhancer",
    description:
      "Rewrites a vague search query into multiple targeted variants: Boolean operators for Google, site-specific searches, and semantic reformulations to surface more precise results.",
    category: "browsing",
    repoOwner: "anthropics-labs",
    tags: ["research", "llm"],
    version: "1.0.0",
    downloadsAllTime: 3900,
    downloadsTrending: 195,
    viewsAllTime: 11_700,
    createdDaysAgo: 42,
  },
  // --- design (2) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "System Architecture Reviewer",
    slug: "system-architecture-reviewer",
    description:
      "Reviews a system design document or diagram description for correctness, scalability risks, single points of failure, and missing non-functional requirements. Returns structured findings.",
    category: "design",
    repoOwner: "craftsman-dev",
    tags: ["code-review", "documentation"],
    version: "0.9.0",
    downloadsAllTime: 6100,
    downloadsTrending: 305,
    viewsAllTime: 18_300,
    createdDaysAgo: 78,
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Component API Designer",
    slug: "component-api-designer",
    description:
      "Designs the public API for a UI component: prop names, types, sensible defaults, and controlled vs uncontrolled patterns — informed by accessibility requirements and usage examples.",
    category: "design",
    repoOwner: "anthropics-labs",
    tags: ["api", "typescript"],
    version: "0.6.0",
    downloadsAllTime: 4700,
    downloadsTrending: 235,
    viewsAllTime: 14_100,
    createdDaysAgo: 38,
  },
  // --- safety (2) ---
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Security Vulnerability Scanner",
    slug: "security-vulnerability-scanner",
    description:
      "Audits source code for common security vulnerabilities: injection flaws, broken auth, insecure deserialization, SSRF, and secrets in code — with severity ratings and remediation steps.",
    category: "safety",
    repoOwner: "craftsman-dev",
    tags: ["security", "code-review"],
    version: "1.3.0",
    downloadsAllTime: 10_800,
    downloadsTrending: 540,
    viewsAllTime: 32_400,
    createdDaysAgo: 150,
    versionHistory: [
      {
        snapshotId: nid() as SnapshotId,
        version: "1.2.0",
        createdDaysAgo: 175,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.1.0",
        createdDaysAgo: 210,
      },
      {
        snapshotId: nid() as SnapshotId,
        version: "1.0.0",
        createdDaysAgo: 260,
      },
    ],
  },
  {
    id: nid() as SkillId,
    snapshotId: nid() as SnapshotId,
    title: "Dependency Audit Helper",
    slug: "dependency-audit-helper",
    description:
      "Analyzes a package.json or requirements.txt for outdated, vulnerable, and unmaintained dependencies. Ranks risk by CVE severity and suggests safe upgrade paths or alternatives.",
    category: "safety",
    repoOwner: "devpro",
    tags: ["security", "testing"],
    version: "1.0.0",
    downloadsAllTime: 7600,
    downloadsTrending: 380,
    viewsAllTime: 22_800,
    createdDaysAgo: 105,
  },
];

// ---------------------------------------------------------------------------
// Test-user owned data (feedback, saved skills, reviews)
// ---------------------------------------------------------------------------

const TEST_FEEDBACKS: FeedbackInsert[] = [
  {
    id: nid() as FeedbackId,
    title: "Search results occasionally return irrelevant skills",
    content:
      "When I search for 'typescript testing', the top results sometimes include unrelated skills like data-analysis prompts. Seems like the ranking weights aren't tuned for tag relevance.",
    type: "bug",
    status: "in_review",
    userId: TEST_USER_ID,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(10),
    response:
      "Thanks for the report! We've identified the issue with the ranking algorithm and a fix is in progress.",
  },
  {
    id: nid() as FeedbackId,
    title: "Add a 'collections' feature to group skills",
    content:
      "It would be great to create personal collections of skills — similar to GitHub stars but organised into named lists. Would make it much easier to manage the skills I use regularly.",
    type: "request",
    status: "pending",
    userId: TEST_USER_ID,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
    response: null,
  },
  {
    id: nid() as FeedbackId,
    title: "Skill detail page loads slowly on first visit",
    content:
      "The skill detail page takes ~3 s to render on first load (cold cache). The snapshot file fetch seems to be the bottleneck — would be great to see the static metadata render instantly while the content streams in.",
    type: "bug",
    status: "resolved",
    userId: TEST_USER_ID,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(5),
    response: "Fixed in the latest deploy — detail pages now SSR the static metadata immediately.",
  },
];

const TEST_SAVED_SKILL_IDS = SKILLS.slice(3, 7).map((s) => s.id);

const TEST_REVIEWS: ReviewInsert[] = [
  {
    id: nid() as ReviewId,
    skillId: SKILLS[3]!.id,
    userId: TEST_USER_ID,
    rating: 5,
    title: "Saved hours on our PR process",
    content:
      "We integrated this into our GitHub Actions workflow and it catches most style/logic issues before human review. The output format is exactly what our team uses.",
    createdAt: new Date(daysAgo(14)),
    updatedAt: new Date(daysAgo(14)),
  },
  {
    id: nid() as ReviewId,
    skillId: SKILLS[4]!.id,
    userId: TEST_USER_ID,
    rating: 4,
    title: "Solid test coverage, minor edge cases missed",
    content:
      "Generates thorough happy-path and error tests. Occasionally misses async boundary edge cases but the output is a great starting point that I iterate on.",
    createdAt: new Date(daysAgo(7)),
    updatedAt: new Date(daysAgo(7)),
  },
];

// ---------------------------------------------------------------------------
// Daily metrics (last 30 days)
// ---------------------------------------------------------------------------

const DAILY_METRICS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(daysAgo(29 - i));
  const day = d.toISOString().slice(0, 10);
  return {
    day,
    newSkills: i < 5 ? 2 : i < 15 ? 1 : 0,
    newSnapshots: i < 5 ? 3 : i < 15 ? 2 : 1,
  };
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const RESET = process.argv.includes("--reset");

async function main() {
  // Check for existing data
  const existing = await db
    .select({ slug: schema.categoryCountsTable.slug })
    .from(schema.categoryCountsTable)
    .limit(1);
  if (existing.length > 0 && !RESET) {
    console.log("Seed data already present. Pass --reset to wipe and re-seed.");
    return;
  }

  if (RESET) {
    console.log("Clearing existing data…");
    await db.delete(schema.reviewsTable);
    await db.delete(schema.savedSkillsTable);
    await db.delete(schema.feedbackTable);
    await db.delete(schema.staticAuditsTable);
    await db.delete(schema.snapshotFilesTable);
    await db.delete(schema.snapshotsTable);
    await db.delete(schema.skillsTagsTable);
    await db.delete(schema.skillsTable);
    await db.delete(schema.reposTable);
    await db.delete(schema.tagsTable);
    await db.delete(schema.categoryCountsTable);
    await db.delete(schema.dailyMetricsTable);
    await db.delete(schema.usersTable);
    console.log("Cleared.");
  }

  // 0. Test user (required for FK constraints on savedSkills / reviews)
  console.log("Inserting test user…");
  const testUserRow: UserInsert = {
    id: TEST_USER_ID,
    email: "test@skills.re",
    emailVerified: true,
    name: "Test User",
    role: "admin",
    createdAt: new Date(daysAgo(365)),
    updatedAt: new Date(daysAgo(365)),
  };
  await db.insert(schema.usersTable).values(testUserRow);

  // 1. Categories
  console.log("Inserting category counts…");
  const categoryRows: CategoryCountInsert[] = CATEGORIES.map((c) => ({
    slug: c.slug,
    count: c.count,
    updatedAt: now,
  }));
  await db.insert(schema.categoryCountsTable).values(categoryRows);

  // 2. Tags
  console.log("Inserting tags…");
  const tagRows: TagInsert[] = TAGS.map((t) => ({
    id: t.id,
    slug: t.slug,
    count: t.count,
    status: "active" as const,
  }));
  await db.insert(schema.tagsTable).values(tagRows);

  // 3. Repos
  console.log("Inserting repos…");
  const repoRows: RepoInsert[] = REPOS.map((r) => ({
    id: r.id,
    name: r.name,
    nameWithOwner: r.nameWithOwner,
    ownerHandle: r.ownerHandle,
    ownerName: r.ownerName,
    defaultBranch: "main",
    forks: Math.floor(r.stars * 0.1),
    stars: r.stars,
    url: `https://github.com/${r.nameWithOwner}`,
    ownerAvatarUrl: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 9_000_000) + 1_000_000}`,
    syncTime: now,
  }));
  await db.insert(schema.reposTable).values(repoRows);

  // 4. Skills + Snapshots (interleaved so FK references resolve)
  console.log("Inserting skills and snapshots…");
  for (const skill of SKILLS) {
    const cat = findCategory(skill.category);
    const repo = findRepo(skill.repoOwner);
    const skillCreatedAt = daysAgo(skill.createdDaysAgo);

    const skillRow: SkillInsert = {
      id: skill.id,
      title: skill.title,
      slug: skill.slug,
      description: skill.description,
      primaryCategory: cat.slug,
      repoId: repo.id,
      latestVersion: skill.version,
      latestSnapshotId: skill.snapshotId,
      downloadsAllTime: skill.downloadsAllTime,
      downloadsTrending: skill.downloadsTrending,
      viewsAllTime: skill.viewsAllTime,
      stargazerCount: repo.stars,
      isVerified: false,
      visibility: "public",
      userId: skill.ownedByTestUser ? TEST_USER_ID : null,
      createdAt: skillCreatedAt,
      updatedAt: skillCreatedAt,
      syncTime: skillCreatedAt,
    };
    await db.insert(schema.skillsTable).values(skillRow);

    const snapshotRow: SnapshotInsert = {
      id: skill.snapshotId,
      skillId: skill.id,
      name: skill.title,
      description: skill.description,
      hash: nanoid(40),
      directoryPath: skill.slug,
      entryPath: `${skill.slug}/skill.md`,
      sourceCommitUrl: buildMockCommitUrl(repo, skill, skill.version),
      version: skill.version,
      isDeprecated: false,
      createdAtMs: skillCreatedAt,
      syncTime: skillCreatedAt,
    };
    await db.insert(schema.snapshotsTable).values(snapshotRow);

    // Upload skill.md to remote R2 and record the file in snapshotFilesTable
    const content = generateSkillContent(skill, repo);
    const r2Key = `${repo.ownerHandle}/${repo.name}/${skill.slug}/${skill.version}/skill.md`;
    const normalizedPath = `${skill.slug}/skill.md`;
    uploadToR2(r2Key, content);
    await db.insert(schema.snapshotFilesTable).values({
      snapshotId: skill.snapshotId,
      path: normalizedPath,
      r2Key,
      fileHash: createHash("sha256").update(content).digest("hex"),
      size: Buffer.byteLength(content, "utf-8"),
      contentType: "text/markdown; charset=utf-8",
    });

    for (const versionSnapshot of skill.versionHistory ?? []) {
      const versionContent = generateSkillContentForVersion(skill, repo, versionSnapshot.version);
      const versionR2Key = `${repo.ownerHandle}/${repo.name}/${skill.slug}/${versionSnapshot.version}/skill.md`;
      uploadToR2(versionR2Key, versionContent);

      await db.insert(schema.snapshotsTable).values({
        id: versionSnapshot.snapshotId,
        skillId: skill.id,
        name: skill.title,
        description: versionSnapshot.description ?? skill.description,
        hash: nanoid(40),
        directoryPath: skill.slug,
        entryPath: `${skill.slug}/skill.md`,
        sourceCommitUrl:
          versionSnapshot.sourceCommitUrl ??
          buildMockCommitUrl(repo, skill, versionSnapshot.version),
        version: versionSnapshot.version,
        isDeprecated: false,
        createdAtMs: daysAgo(versionSnapshot.createdDaysAgo),
        syncTime: daysAgo(versionSnapshot.createdDaysAgo),
      });

      await db.insert(schema.snapshotFilesTable).values({
        snapshotId: versionSnapshot.snapshotId,
        path: normalizedPath,
        r2Key: versionR2Key,
        fileHash: createHash("sha256").update(versionContent).digest("hex"),
        size: Buffer.byteLength(versionContent, "utf-8"),
        contentType: "text/markdown; charset=utf-8",
      });
    }
  }

  // 5. Skills–Tags associations
  console.log("Inserting skill–tag links…");
  const skillTagLinks: { skillId: SkillId; tagId: TagId }[] = [];
  for (const skill of SKILLS) {
    for (const tagSlug of skill.tags) {
      skillTagLinks.push({ skillId: skill.id, tagId: tagId(tagSlug) });
    }
  }
  await db.insert(schema.skillsTagsTable).values(skillTagLinks);

  // 6. Static audits for the first half of skills
  console.log("Inserting static audits…");
  const auditedSkills = SKILLS.slice(0, Math.ceil(SKILLS.length / 2));
  const auditRows: StaticAuditInsert[] = auditedSkills.map((skill) => {
    const score = 70 + Math.floor(Math.random() * 28);
    const riskLevel = score >= 90 ? "safe" : score >= 75 ? "low" : "medium";
    return {
      id: nid() as StaticAuditId,
      snapshotId: skill.snapshotId,
      auditJson: "{}",
      findingsJson: "[]",
      riskFactorsJson: "[]",
      generatedAt: daysAgo(skill.createdDaysAgo - 1),
      idempotencyKey: `seed-${skill.snapshotId}`,
      isBlocked: false,
      modelVersion: "seed-v1",
      overallScore: score,
      pipeline: "seed",
      pipelineRunId: nid(),
      reason: null,
      repoName: findRepo(skill.repoOwner).name,
      repoOwner: skill.repoOwner,
      riskLevel: riskLevel as "safe" | "low" | "medium",
      rulesVersion: "1.0.0",
      safeToPublish: score >= 70,
      skillRootPath: `./${skill.slug}`,
      sourceHash: nanoid(40),
      sourceRef: "main",
      sourceType: "snapshot",
      status: "pass" as const,
      summary: `Automated seed audit for ${skill.title}. No critical issues found.`,
      syncTime: daysAgo(skill.createdDaysAgo - 1),
      totalLines: 80 + Math.floor(Math.random() * 120),
      filesScanned: 1,
    };
  });
  await db.insert(schema.staticAuditsTable).values(auditRows);

  // 7. Daily metrics
  console.log("Inserting daily metrics…");
  const dailyMetricRows: DailyMetricInsert[] = DAILY_METRICS;
  await db.insert(schema.dailyMetricsTable).values(dailyMetricRows);

  // 8. Test-user feedback
  console.log("Inserting test-user feedback…");
  await db.insert(schema.feedbackTable).values(TEST_FEEDBACKS);

  // 9. Test-user saved skills
  console.log("Inserting test-user saved skills…");
  const savedSkillRows: SavedSkillInsert[] = TEST_SAVED_SKILL_IDS.map((skillId) => ({
    id: nid() as SavedSkillId,
    skillId,
    userId: TEST_USER_ID,
    createdAt: new Date(daysAgo(5)),
    updatedAt: new Date(daysAgo(5)),
  }));
  await db.insert(schema.savedSkillsTable).values(savedSkillRows);

  // 10. Test-user reviews
  console.log("Inserting test-user reviews…");
  await db.insert(schema.reviewsTable).values(TEST_REVIEWS);

  console.log(
    `\nSeed complete — ${SKILLS.length} skills, ${CATEGORIES.length} categories, ${TAGS.length} tags.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
