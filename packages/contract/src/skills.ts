import { z } from "zod";

import { baseContract } from "./common/base";
import { submitGithubPreparedOutputSchema } from "./common/github";
import {
  authorListItemSchema,
  authorSchema,
  searchSkillListItemSchema,
  skillBasicSchema,
  skillListItemSchema,
  skillPathSchema,
} from "./common/content";
import {
  githubOwnerSchema,
  githubRepoSchema,
  skillSlugSchema,
  tagSlugSchema,
} from "./common/slugs";

const skillLookupInputSchema = z.object({
  slug: skillSlugSchema,
});

const skillListInputSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const skillListMineInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .optional();

const skillListMineItemSchema = z.object({
  authorHandle: z.string().optional(),
  createdAt: z.number().int().nonnegative().optional(),
  description: z.string(),
  id: z.string().min(1),
  latestVersion: z.string().optional(),
  repoName: z.string().optional(),
  slug: skillSlugSchema,
  title: z.string(),
  updatedAt: z.number().int().nonnegative().optional(),
});

const saveSkillInputSchema = z.object({
  slug: skillSlugSchema,
});

const saveSkillResultSchema = z.object({
  alreadySaved: z.boolean(),
  saved: z.boolean(),
});

const authorHandleInputSchema = z.object({
  handle: z.string().min(1),
});

const skillByPathInputSchema = z.object({
  authorHandle: z.string().min(1),
  repoName: z.string().min(1).optional(),
  skillSlug: z.string().min(1),
});

const skillHistoryInfoInputSchema = z.object({
  skillIds: z.array(z.string().min(1)),
});

const searchSkillsInputSchema = z
  .object({
    authorHandle: z.string().optional(),
    categories: z.array(tagSlugSchema).optional(),
    cursor: z.string().optional(),
    mode: z.enum(["ai", "normal"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    minAuditScore: z.number().int().min(0).max(100).optional(),
    minScore: z.number().int().min(0).max(100).optional(),
    query: z.string().optional(),
    rewriteQuery: z.boolean().optional(),
    sort: z
      .enum(["newest", "updated", "views", "downloads-trending", "downloads-all-time", "stars"])
      .optional(),
    tags: z.array(tagSlugSchema).optional(),
  })
  .optional();

const searchSkillsResultSchema = z.object({
  ai: z
    .object({
      mode: z.literal("ai"),
      raw: z.unknown().optional(),
      resolvedSkillsCount: z.number().int().nonnegative(),
      resultCount: z.number().int().nonnegative(),
    })
    .optional(),
  continueCursor: z.string(),
  isDone: z.boolean(),
  page: z.array(searchSkillListItemSchema),
});

const aiSearchResultSchema = z
  .object({
    data: z.array(z.unknown()).optional(),
    has_more: z.boolean().optional(),
    response: z.unknown().optional(),
    search_query: z.string().optional(),
  })
  .passthrough();

const skillListContract = baseContract
  .route({
    description:
      "Returns a paginated list of public skills for the browse page and shared API consumers.",
    method: "GET",
    path: "/skills",
    tags: ["Skills"],
    successDescription: "Paginated public skills",
    summary: "List public skills",
  })
  .input(skillListInputSchema)
  .output(
    z.object({
      continueCursor: z.string(),
      isDone: z.boolean(),
      page: z.array(skillListItemSchema),
    }),
  );

const skillCountContract = baseContract
  .route({
    description: "Returns the total number of public skills currently available.",
    method: "GET",
    path: "/skills/count",
    tags: ["Skills"],
    successDescription: "Public skill count",
    summary: "Count public skills",
  })
  .output(z.number().int().nonnegative());

const skillBasicContract = baseContract
  .route({
    description: "Returns the basic public skill record used for lightweight metadata lookups.",
    method: "GET",
    path: "/skills/basic",
    tags: ["Skills"],
    successDescription: "Basic skill record",
    summary: "Read a skill summary",
  })
  .input(skillLookupInputSchema)
  .output(skillBasicSchema.nullable());

const resolveSkillPathContract = baseContract
  .route({
    description: "Resolves the canonical author, repo, and skill slug tuple for a public skill.",
    method: "GET",
    path: "/skills/resolve-path",
    tags: ["Skills"],
    successDescription: "Canonical skill path",
    summary: "Resolve a skill path",
  })
  .input(skillLookupInputSchema)
  .output(skillPathSchema.nullable());

const skillByPathContract = baseContract
  .route({
    description: "Looks up a public skill by its canonical author, repo, and skill slug path.",
    method: "GET",
    path: "/skills/by-path",
    tags: ["Skills"],
    successDescription: "Skill resolved by path",
    summary: "Read a skill by path",
  })
  .input(skillByPathInputSchema)
  .output(searchSkillListItemSchema.nullable());

const skillExistingContract = baseContract
  .route({
    description: "Checks whether a public skill slug already exists in the catalog.",
    method: "GET",
    path: "/skills/check-existing",
    tags: ["Skills"],
    successDescription: "Skill existence check",
    summary: "Check skill existence",
  })
  .input(skillLookupInputSchema)
  .output(z.boolean());

const authorByHandleContract = baseContract
  .route({
    description: "Returns the public author profile for a GitHub handle.",
    method: "GET",
    path: "/skills/author",
    tags: ["Skills"],
    successDescription: "Author profile",
    summary: "Read an author profile",
  })
  .input(authorHandleInputSchema)
  .output(authorSchema.nullable());

const claimAsAuthorInputSchema = z.object({
  slug: skillSlugSchema,
});

const claimAsAuthorResultSchema = z.object({
  alreadyClaimed: z.boolean(),
  claimed: z.boolean(),
});

const submitGithubRepoPublicInputSchema = z.object({
  owner: githubOwnerSchema,
  repo: githubRepoSchema,
  skillRootPath: z.string().optional(),
  skillRootPaths: z.array(z.string()).optional(),
});

const submitGithubRepoPublicResultSchema = z.object({
  reason: z.string().optional(),
  skillsCount: z.number().int().nonnegative(),
  status: z.enum(["submitted", "skipped"]),
  workflowId: z.string().optional(),
});

const uploadSkillsResultSchema = z.object({
  ids: z.array(z.string()),
  workId: z.string(),
});

const listAuthorsContract = baseContract
  .route({
    description: "Returns the public author directory used by author browsing surfaces.",
    method: "GET",
    path: "/skills/authors",
    tags: ["Skills"],
    successDescription: "Public author list",
    summary: "List public authors",
  })
  .output(z.array(authorListItemSchema));

const skillHistoryInfoItemSchema = z.object({
  directoryPath: z.string(),
  entryPath: z.string(),
  id: z.string(),
  latestDescription: z.string(),
  latestName: z.string(),
  latestVersion: z.string().optional(),
});

export const skillsContract = {
  checkExisting: skillExistingContract,
  getAuthorByHandle: authorByHandleContract,
  count: skillCountContract,
  getBasic: skillBasicContract,
  getByPath: skillByPathContract,
  getSkillsHistoryInfo: baseContract
    .route({
      description: "Returns the latest snapshot metadata for a set of public skills.",
      method: "POST",
      path: "/skills/history-info",
      tags: ["Skills"],
      successDescription: "Skill history info",
      summary: "Read skill history info",
    })
    .input(skillHistoryInfoInputSchema)
    .output(z.array(skillHistoryInfoItemSchema)),
  search: baseContract
    .route({
      description: "Searches public skills with legacy browse filters and sort options.",
      method: "POST",
      path: "/skills/search",
      tags: ["Skills"],
      successDescription: "Skill search results",
      summary: "Search public skills",
    })
    .input(searchSkillsInputSchema)
    .output(searchSkillsResultSchema),
  aiSearch: baseContract
    .route({
      description: "Searches the managed AI Search corpus and returns the raw provider payload.",
      method: "POST",
      path: "/skills/ai-search",
      tags: ["Skills"],
      successDescription: "AI search result",
      summary: "Run AI search",
    })
    .input(
      z.object({
        query: z.string().trim().min(1),
        rewriteQuery: z.boolean().optional(),
      }),
    )
    .output(aiSearchResultSchema),
  claimAsAuthor: baseContract
    .route({
      description: "Claims a skill as the authenticated GitHub owner of the repository.",
      method: "POST",
      path: "/skills/claim-as-author",
      tags: ["Skills"],
      successDescription: "Claim result",
      summary: "Claim a skill as author",
    })
    .input(claimAsAuthorInputSchema)
    .output(claimAsAuthorResultSchema),
  save: baseContract
    .route({
      description: "Saves a public skill to the authenticated user's dashboard.",
      method: "POST",
      path: "/skills/save",
      tags: ["Skills"],
      successDescription: "Save result",
      summary: "Save a skill",
    })
    .input(saveSkillInputSchema)
    .output(saveSkillResultSchema),
  list: skillListContract,
  listAuthors: listAuthorsContract,
  listMine: baseContract
    .route({
      description: "Returns the authenticated user's own skills regardless of visibility.",
      method: "GET",
      path: "/skills/mine",
      tags: ["Skills"],
      successDescription: "Owned skill list",
      summary: "List my skills",
    })
    .input(skillListMineInputSchema)
    .output(z.array(skillListMineItemSchema)),
  listMineSaved: baseContract
    .route({
      description: "Returns the authenticated user's saved skills, sorted by save time.",
      method: "GET",
      path: "/skills/saved",
      tags: ["Skills"],
      successDescription: "Saved skill list",
      summary: "List my saved skills",
    })
    .input(skillListMineInputSchema)
    .output(z.array(skillListMineItemSchema)),
  resolvePathBySlug: resolveSkillPathContract,
  uploadSkills: baseContract
    .route({
      description: "Uploads a prepared GitHub skill payload into the background workflow pipeline.",
      method: "POST",
      path: "/skills/upload",
      tags: ["Skills"],
      successDescription: "Upload queued",
      summary: "Upload prepared skills",
    })
    .input(submitGithubPreparedOutputSchema)
    .output(uploadSkillsResultSchema),
  submitGithubRepoPublic: baseContract
    .route({
      description:
        "Submits a public GitHub repository for skill ingestion when it contains valid skill content.",
      method: "POST",
      path: "/skills/submit",
      tags: ["Skills"],
      successDescription: "GitHub repository submission result",
      summary: "Submit a public GitHub repository",
    })
    .input(submitGithubRepoPublicInputSchema)
    .output(submitGithubRepoPublicResultSchema),
} as const;
