import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";

import {
  adminProcedure,
  apiUserProcedure,
  protectedProcedure,
  publicProcedure,
} from "../procedures";
import {
  checkDuplicatedRepo,
  resolveCliInstall,
  checkExistingRepo,
  enqueueRepoStatsSync,
  checkExistingSkill,
  aiSearch,
  addSkillToCollection,
  countCategories,
  countCollections,
  countAuthors,
  countMineFeedback,
  countMineReviews,
  createCollection,
  createFeedbackRecord,
  FeedbackCreateError,
  createReviewRecord,
  newsletterService,
  deleteCollection,
  getFeedbackById,
  getMineFeedbackById,
  getMyReviewBySkill,
  getCollectionBySlug,
  getMineCollectionById,
  countSkills,
  countTags,
  claimAsAuthor,
  getAuthorByHandle,
  getBasicSkill,
  getCategoryBySlug,
  getCategoryTopSkillsBySlug,
  getBySkillAndVersion,
  getSkillByPath,
  getSkillsHistoryInfo,
  getSnapshotDownloadManifest,
  getSnapshotFileSignedUrl,
  getSnapshotTreeEntries,
  getTagBySlug,
  getTagTopSkillsBySlug,
  listAuthors,
  listCategories,
  listCategoriesForAi,
  listCollections,
  listFeedback,
  listMineFeedback,
  listMineCollections,
  listIndexableTags,
  listReposByOwner,
  listReposPage,
  listMineReviews,
  checkSavedSkillByUser,
  listMineSavedSkills,
  getReviewStatsBySkill,
  listReviewsBySkill,
  unsaveSkill,
  listSnapshotsBySkill,
  listMineSkills,
  listSkills,
  listTags,
  listTagsForSeo,
  listTagsPage,
  fetchGithubRepo,
  getStaticAuditReportBySnapshot,
  removeSkillFromCollection,
  resolvePathBySlug,
  saveSkillToCollection,
  setCollectionSkills,
  syncRepoStats,
  updateCollection,
  updateRepoStats,
  updateFeedbackResponse,
  updateFeedbackStatus,
  submitGithubPreparedPublic,
  submitGithubRepoPublic,
  uploadSnapshotFiles,
  readSnapshotFileContent,
  uploadSkills,
  searchSkills,
  skillEvalSandboxService,
} from "../modules";
import { metricsRouter } from "./metrics";

const DUPLICATE_REVIEW_MESSAGE = "You have already reviewed this skill.";
const SKILL_REPORT_TYPES = ["skill_issue", "skill_display", "skill_takedown"] as const;

export const canCreateFeedbackAnonymously = (type?: string | null): boolean =>
  type ? (SKILL_REPORT_TYPES as readonly string[]).includes(type) : false;

export const mapCreateFeedbackError = (error: unknown) => {
  if (!(error instanceof FeedbackCreateError)) {
    return null;
  }

  return new ORPCError(error.code, { message: error.message });
};

export const mapCollectionReadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : null;
  if (!message) {
    return null;
  }

  if (message.includes("not found")) {
    return new ORPCError("NOT_FOUND", { message });
  }

  if (message.includes("Forbidden")) {
    return new ORPCError("FORBIDDEN", { message });
  }

  return null;
};

export const normalizeErrorForLog = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 3).join("\n"),
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    name: "NonError",
  };
};

export const anonymizeIdForLog = (value: string) =>
  value.length <= 8 ? "[redacted]" : `${value.slice(0, 4)}...${value.slice(-4)}`;

const isSkillEvalSandboxEnabled = (context: { features?: { skillEvalSandboxEnabled?: boolean } }) =>
  context.features?.skillEvalSandboxEnabled === true;

const isUniqueConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: unknown;
    errno?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  if (
    maybeError.code === "SQLITE_CONSTRAINT" ||
    maybeError.code === "23505" ||
    maybeError.errno === 2067
  ) {
    return true;
  }

  if (typeof maybeError.message === "string") {
    const message = maybeError.message.toLowerCase();
    if (
      message.includes("unique constraint") ||
      message.includes("constraint failed") ||
      message.includes("not unique")
    ) {
      return true;
    }
  }

  return isUniqueConstraintError(maybeError.cause);
};

type CreateReviewRecord = typeof createReviewRecord;

export const createReviewProcedure = (createReview: CreateReviewRecord = createReviewRecord) =>
  apiUserProcedure.reviews.create.handler(async ({ input, context }) => {
    try {
      return await createReview({
        content: input.content,
        rating: input.rating,
        skillId: input.skillId,
        title: input.title,
        userId: context.apiUser.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Create review failed.";
      if (message === DUPLICATE_REVIEW_MESSAGE || isUniqueConstraintError(error)) {
        throw new ORPCError("CONFLICT", {
          message: DUPLICATE_REVIEW_MESSAGE,
        });
      }

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Create review failed.",
      });
    }
  });

export const appRouter = {
  healthCheck: publicProcedure.healthCheck.handler(() => "OK"),
  categories: {
    count: publicProcedure.categories.count.handler(() => countCategories()),
    getBySlug: publicProcedure.categories.getBySlug.handler(({ input }) =>
      getCategoryBySlug(input),
    ),
    getTopSkillsBySlug: publicProcedure.categories.getTopSkillsBySlug.handler(({ input }) =>
      getCategoryTopSkillsBySlug(input),
    ),
    list: publicProcedure.categories.list.handler(({ input }) => listCategories(input)),
    listForAi: publicProcedure.categories.listForAi.handler(({ input }) =>
      listCategoriesForAi(input as { limit?: number } | undefined),
    ),
  },
  cli: {
    auth: {
      revoke: protectedProcedure.cli.auth.revoke.handler(async ({ context }) => {
        await context.revokeSession?.();
        return { revoked: true };
      }),
      session: protectedProcedure.cli.auth.session.handler(({ context }) => {
        const { user, session } = context.session;
        return {
          expiresAt: new Date(session.expiresAt).toISOString(),
          user: { email: user.email, id: user.id, name: user.name },
        };
      }),
    },
    skills: {
      resolveInstall: publicProcedure.cli.skills.resolveInstall.handler(
        async ({ input, context }) => {
          try {
            return await resolveCliInstall({
              requestHeaders: context.requestHeaders,
              skill: input.skill,
              version: input.version,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Install resolution failed.";
            if (message.includes("not found") || message.includes("No installable snapshot")) {
              throw new ORPCError("NOT_FOUND", { message });
            }
            throw error;
          }
        },
      ),
      notifyInstall: publicProcedure.cli.skills.notifyInstall.handler(
        async ({ input, context }) => {
          const match = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)/i.exec(input.repoUrl);
          if (!match?.[1] || !match?.[2]) {
            return { received: false };
          }
          const [, repoOwner] = match;
          const repoName = match[2].replace(/\.git$/, "");
          const { findRepoByNameWithOwner } = await import("../modules/repos/repo");
          const existing = await findRepoByNameWithOwner(`${repoOwner}/${repoName}`);
          // oxlint-disable-next-line unicorn/prefer-ternary
          if (existing) {
            await context.workflowSchedulers?.repoSnapshotSync?.enqueue({ repoName, repoOwner });
          } else {
            await context.workflowSchedulers?.repoSkillsDiscovery?.enqueue({
              repoName,
              repoOwner,
            });
          }
          return { received: true };
        },
      ),
    },
  },
  collections: {
    count: publicProcedure.collections.count.handler(() => countCollections()),
    getBySlug: publicProcedure.collections.getBySlug.handler(({ input, context }) =>
      getCollectionBySlug(input, {
        isAdmin: context.session?.user.role === "admin",
        userId: context.session?.user.id,
      }),
    ),
    list: publicProcedure.collections.list.handler(({ input }) => listCollections(input)),
    listMine: protectedProcedure.collections.listMine.handler(({ context }) =>
      listMineCollections({
        isAdmin: context.session.user.role === "admin",
        userId: context.session.user.id,
      }),
    ),
    getMineById: protectedProcedure.collections.getMineById.handler(async ({ input, context }) => {
      try {
        return await getMineCollectionById(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const mapped = mapCollectionReadError(error);
        if (mapped) {
          throw mapped;
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Read collection failed.",
        });
      }
    }),
    create: protectedProcedure.collections.create.handler(async ({ input, context }) => {
      try {
        return await createCollection(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ORPCError("CONFLICT", { message: "Collection slug already exists" });
        }
        throw error;
      }
    }),
    update: protectedProcedure.collections.update.handler(async ({ input, context }) => {
      try {
        return await updateCollection(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update failed.";
        if (message.includes("not found")) {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (message.includes("Forbidden")) {
          throw new ORPCError("FORBIDDEN", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Update failed." });
      }
    }),
    delete: protectedProcedure.collections.delete.handler(async ({ input, context }) => {
      try {
        return await deleteCollection(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Delete failed.";
        if (message.includes("not found")) {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (message.includes("Forbidden")) {
          throw new ORPCError("FORBIDDEN", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Delete failed." });
      }
    }),
    addSkill: protectedProcedure.collections.addSkill.handler(async ({ input, context }) => {
      try {
        return await addSkillToCollection(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Add skill failed.";
        if (message.includes("not found")) {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (message.includes("Forbidden")) {
          throw new ORPCError("FORBIDDEN", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Add skill failed." });
      }
    }),
    saveSkill: protectedProcedure.collections.saveSkill.handler(async ({ input, context }) => {
      try {
        return await saveSkillToCollection(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Save skill failed.";
        if (message === "Skill not found." || message.includes("not found")) {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (message.includes("Forbidden")) {
          throw new ORPCError("FORBIDDEN", { message });
        }
        if (isUniqueConstraintError(error)) {
          throw new ORPCError("CONFLICT", { message: "Collection slug already exists" });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Save skill failed." });
      }
    }),
    removeSkill: protectedProcedure.collections.removeSkill.handler(async ({ input, context }) => {
      try {
        return await removeSkillFromCollection(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Remove skill failed.";
        if (message.includes("not found")) {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (message.includes("Forbidden")) {
          throw new ORPCError("FORBIDDEN", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Remove skill failed." });
      }
    }),
    setSkills: protectedProcedure.collections.setSkills.handler(async ({ input, context }) => {
      try {
        return await setCollectionSkills(input, {
          isAdmin: context.session.user.role === "admin",
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Set skills failed.";
        if (message.includes("not found")) {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (message.includes("Forbidden")) {
          throw new ORPCError("FORBIDDEN", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Set skills failed." });
      }
    }),
  },
  feedback: {
    countMine: protectedProcedure.feedback.countMine.handler(({ context }) =>
      countMineFeedback({ userId: context.session.user.id }),
    ),
    create: publicProcedure.feedback.create.handler(async ({ input, context }) => {
      const userId = context.session?.user.id ?? null;
      if (!userId && !canCreateFeedbackAnonymously(input.type)) {
        throw new ORPCError("UNAUTHORIZED");
      }

      try {
        return await createFeedbackRecord({
          content: input.content,
          skillId: input.skillId,
          skillSlug: input.skillSlug,
          skillTitle: input.skillTitle,
          title: input.title,
          type: input.type,
          userId,
        });
      } catch (error) {
        const mappedError = mapCreateFeedbackError(error);
        if (mappedError) {
          throw mappedError;
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Create feedback failed.",
        });
      }
    }),
    getById: adminProcedure.feedback.getById.handler(({ input }) => getFeedbackById(input.id)),
    getMineById: protectedProcedure.feedback.getMineById.handler(({ input, context }) =>
      getMineFeedbackById({
        id: input.id,
        userId: context.session.user.id,
      }),
    ),
    list: adminProcedure.feedback.list.handler(({ input }) => listFeedback(input)),
    listMine: protectedProcedure.feedback.listMine.handler(({ input, context }) =>
      listMineFeedback({
        limit: input?.limit,
        userId: context.session.user.id,
      }),
    ),
    updateResponse: adminProcedure.feedback.updateResponse.handler(({ input }) =>
      updateFeedbackResponse(input),
    ),
    updateStatus: adminProcedure.feedback.updateStatus.handler(({ input }) =>
      updateFeedbackStatus(input),
    ),
  },
  reviews: {
    countMine: protectedProcedure.reviews.countMine.handler(({ context }) =>
      countMineReviews({ userId: context.session.user.id }),
    ),
    create: createReviewProcedure(),
    getMineBySkill: protectedProcedure.reviews.getMineBySkill.handler(({ input, context }) =>
      getMyReviewBySkill({
        skillId: input.skillId,
        userId: context.session.user.id,
      }),
    ),
    listBySkill: publicProcedure.reviews.listBySkill.handler(({ input }) =>
      listReviewsBySkill(input),
    ),
    statsBySkill: publicProcedure.reviews.statsBySkill.handler(({ input }) =>
      getReviewStatsBySkill(input),
    ),
    listMine: protectedProcedure.reviews.listMine.handler(({ input, context }) =>
      listMineReviews({ limit: input.limit, userId: context.session.user.id }),
    ),
  },
  newsletter: {
    create: publicProcedure.newsletter.create.handler(({ input, context }) => {
      const h = context.requestHeaders;
      const ip =
        h?.get("cf-connecting-ip") ?? h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const country = h?.get("cf-ipcountry") ?? null;
      const city = h?.get("cf-ipcity") ?? null;
      const ua = h?.get("user-agent") ?? "";
      const device: "mobile" | "desktop" = /mobile/i.test(ua) ? "mobile" : "desktop";
      return newsletterService.create({ email: input.email, ip, country, city, device });
    }),
  },
  github: {
    fetchRepo: publicProcedure.github.fetchRepo.handler(({ input, context }) => {
      const runtime = context.githubFetch;
      if (!runtime) {
        throw new ORPCError("SERVICE_UNAVAILABLE");
      }

      return fetchGithubRepo(input, runtime);
    }),
  },
  metrics: metricsRouter,
  staticAudits: {
    getReportBySnapshot: publicProcedure.staticAudits.getReportBySnapshot.handler(({ input }) =>
      getStaticAuditReportBySnapshot(input.snapshotId),
    ),
  },
  skillEvalSandbox: {
    createRun: protectedProcedure.skillEvalSandbox.createRun.handler(({ input, context }) => {
      if (!isSkillEvalSandboxEnabled(context)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Skill eval sandbox is not enabled.",
        });
      }

      return skillEvalSandboxService.createRun(
        input,
        {
          userId: context.session.user.id,
        },
        {
          runScheduler: context.workflowSchedulers?.skillEvalRun ?? null,
        },
      );
    }),
    createStreamToken: protectedProcedure.skillEvalSandbox.createStreamToken.handler(
      ({ input, context }) =>
        skillEvalSandboxService.createStreamToken(input, {
          userId: context.session.user.id,
        }),
    ),
    getRunDetail: publicProcedure.skillEvalSandbox.getRunDetail.handler(({ input, context }) => {
      if (!isSkillEvalSandboxEnabled(context)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Skill eval sandbox is not enabled.",
        });
      }

      return skillEvalSandboxService.getRunDetail(input);
    }),
    getSuite: publicProcedure.skillEvalSandbox.getSuite.handler(({ input, context }) => {
      if (!isSkillEvalSandboxEnabled(context)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Skill eval sandbox is not enabled.",
        });
      }

      return skillEvalSandboxService.getSuite(input);
    }),
    listAgents: publicProcedure.skillEvalSandbox.listAgents.handler(({ context }) => {
      if (!isSkillEvalSandboxEnabled(context)) {
        return [];
      }

      return skillEvalSandboxService.listAgents();
    }),
    listRunsBySkill: publicProcedure.skillEvalSandbox.listRunsBySkill.handler(
      ({ input, context }) => {
        if (!isSkillEvalSandboxEnabled(context)) {
          throw new ORPCError("FORBIDDEN", {
            message: "Skill eval sandbox is not enabled.",
          });
        }

        return skillEvalSandboxService.listRunsBySkill(input);
      },
    ),
  },
  repos: {
    checkDuplicated: publicProcedure.repos.checkDuplicated.handler(({ input }) =>
      checkDuplicatedRepo(input),
    ),
    checkExisting: publicProcedure.repos.checkExisting.handler(({ input }) =>
      checkExistingRepo(input),
    ),
    listByOwner: publicProcedure.repos.listByOwner.handler(async ({ input }) => {
      const page = (await listReposByOwner(input)) as {
        continueCursor: string;
        isDone: boolean;
        repos: {
          nameWithOwner: string;
          repoName: string;
          repoOwner: string;
          skillCount: number;
        }[];
      };

      return {
        continueCursor: page.continueCursor,
        isDone: page.isDone,
        repos: page.repos.map((repo) => ({
          nameWithOwner: repo.nameWithOwner,
          repoName: repo.repoName,
          repoOwner: repo.repoOwner,
          skillCount: repo.skillCount,
        })),
      };
    }),
    listPage: publicProcedure.repos.listPage.handler(({ input }) => listReposPage(input)),
    updateStats: adminProcedure.repos.updateStats.handler(({ input }) => updateRepoStats(input)),
    syncStats: adminProcedure.repos.syncStats.handler(({ input, context }) =>
      syncRepoStats(input, context.githubStats),
    ),
    enqueueRepoStatsSync: adminProcedure.repos.enqueueRepoStatsSync.handler(
      ({ input, context }) => {
        const scheduler = context.workflowSchedulers?.repoStatsSync;
        if (!scheduler) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return enqueueRepoStatsSync(scheduler, input);
      },
    ),
    enqueueRepoSkillsDiscovery: adminProcedure.repos.enqueueRepoSkillsDiscovery.handler(
      ({ input, context }) => {
        const scheduler = context.workflowSchedulers?.repoSkillsDiscovery;
        if (!scheduler) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return scheduler.enqueue(input);
      },
    ),
  },
  snapshots: {
    getBySkillAndVersion: publicProcedure.snapshots.getBySkillAndVersion.handler(({ input }) =>
      getBySkillAndVersion(input),
    ),
    getSnapshotDownloadManifest: publicProcedure.snapshots.getSnapshotDownloadManifest.handler(
      ({ input }) => getSnapshotDownloadManifest(input),
    ),
    getSnapshotFileSignedUrl: publicProcedure.snapshots.getSnapshotFileSignedUrl.handler(
      ({ input, context }) => getSnapshotFileSignedUrl(input, context.snapshotStorage),
    ),
    getSnapshotTreeEntries: publicProcedure.snapshots.getSnapshotTreeEntries.handler(({ input }) =>
      getSnapshotTreeEntries(input),
    ),
    listBySkill: publicProcedure.snapshots.listBySkill.handler(({ input }) =>
      listSnapshotsBySkill(input),
    ),
    createHistoricalSnapshots: adminProcedure.snapshots.createHistoricalSnapshots.handler(
      ({ input, context }) => {
        const runtime = context.snapshotHistory;
        if (!runtime) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return runtime.createHistoricalSnapshots(input);
      },
    ),
    readSnapshotFileContent: publicProcedure.snapshots.readSnapshotFileContent.handler(
      ({ input, context }) => readSnapshotFileContent(input, context.snapshotStorage),
    ),
    uploadSnapshotFiles: adminProcedure.snapshots.uploadSnapshotFiles.handler(
      ({ input, context }) => {
        const scheduler = context.workflowSchedulers?.snapshotUpload;
        if (!scheduler) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return uploadSnapshotFiles(input, scheduler);
      },
    ),
  },
  skills: {
    checkExisting: publicProcedure.skills.checkExisting.handler(({ input }) =>
      checkExistingSkill(input),
    ),
    count: publicProcedure.skills.count.handler(() => countSkills()),
    save: apiUserProcedure.skills.save.handler(async ({ input, context }) => {
      try {
        const result = await saveSkillToCollection(
          {
            skillSlug: input.slug,
          },
          {
            isAdmin: context.apiUser.isAdmin,
            userId: context.apiUser.id,
          },
        );

        return {
          alreadySaved: result.alreadySaved,
          saved: result.saved,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Save failed.";
        console.error("[skills.save] failed", {
          error: normalizeErrorForLog(error),
          message,
          skillSlug: input.slug,
          userId: anonymizeIdForLog(context.apiUser.id),
        });
        if (message === "Skill not found.") {
          throw new ORPCError("NOT_FOUND", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Save failed.",
        });
      }
    }),
    claimAsAuthor: protectedProcedure.skills.claimAsAuthor.handler(async ({ input, context }) => {
      try {
        return await claimAsAuthor({
          githubHandle: context.session.user.github ?? null,
          slug: input.slug,
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Claim failed.";
        if (message === "Skill not found.") {
          throw new ORPCError("NOT_FOUND", { message });
        }
        if (
          message.includes("linked to GitHub") ||
          message.includes("no repo owner was found") ||
          message.includes("does not match") ||
          message.includes("already been claimed")
        ) {
          const code = message.includes("already been claimed") ? "CONFLICT" : "BAD_REQUEST";
          throw new ORPCError(code, { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Claim as author failed.",
        });
      }
    }),
    getAuthorByHandle: publicProcedure.skills.getAuthorByHandle.handler(({ input }) =>
      getAuthorByHandle(input),
    ),
    getBasic: publicProcedure.skills.getBasic.handler(({ input }) => getBasicSkill(input)),
    getByPath: publicProcedure.skills.getByPath.handler(({ input }) => getSkillByPath(input)),
    getSkillsHistoryInfo: publicProcedure.skills.getSkillsHistoryInfo.handler(({ input }) =>
      getSkillsHistoryInfo(input as { skillIds: string[] }),
    ),
    list: publicProcedure.skills.list.handler(({ input }) => listSkills(input)),
    countAuthors: publicProcedure.skills.countAuthors.handler(() => countAuthors()),
    listAuthors: publicProcedure.skills.listAuthors.handler(({ input }) => listAuthors(input)),
    listMine: protectedProcedure.skills.listMine.handler(({ input, context }) =>
      listMineSkills({ limit: input?.limit, userId: context.session.user.id }),
    ),
    listMineSaved: apiUserProcedure.skills.listMineSaved.handler(({ input, context }) =>
      listMineSavedSkills({
        cursor: input?.cursor,
        limit: input?.limit,
        userId: context.apiUser.id,
      }),
    ),
    checkSaved: apiUserProcedure.skills.checkSaved.handler(({ input, context }) =>
      checkSavedSkillByUser({ slug: input.slug, userId: context.apiUser.id }),
    ),
    unsave: apiUserProcedure.skills.unsave.handler(async ({ input, context }) => {
      try {
        return await unsaveSkill({ slug: input.slug, userId: context.apiUser.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unsave failed.";
        if (message === "Skill not found.") {
          throw new ORPCError("NOT_FOUND", { message });
        }
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Unsave failed." });
      }
    }),
    aiSearch: publicProcedure.skills.aiSearch.handler(({ input, context }) =>
      aiSearch(input, context.aiSearch),
    ),
    search: publicProcedure.skills.search.handler(({ input, context }) =>
      searchSkills(input, context.aiSearch, context.features?.skillKeywordSearch, {
        recordQueryFailure: (event) => {
          context.workerLogger?.warn("skills.search.keyword_query_failure", { ...event });
        },
        recordQueryResult: (event) => {
          if (context.features?.skillKeywordSearchDebugLogsEnabled) {
            context.workerLogger?.info("skills.search.keyword_query_result", { ...event });
          }
        },
        recordShadowComparison: (event) => {
          context.workerLogger?.info("skills.search.keyword_shadow_comparison", { ...event });
        },
        waitUntil: context.waitUntil,
      }),
    ),
    resolvePathBySlug: publicProcedure.skills.resolvePathBySlug.handler(({ input }) =>
      resolvePathBySlug(input),
    ),
    submitGithubRepoPublic: publicProcedure.skills.submitGithubRepoPublic.handler(
      ({ input, context }) => {
        const runtime = context.githubSubmit;
        if (!runtime) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return submitGithubRepoPublic(input, runtime, context.workflowSchedulers?.skillsUpload);
      },
    ),
    submitGithubPreparedPublic: publicProcedure.skills.submitGithubPreparedPublic.handler(
      ({ input, context }) => {
        const scheduler = context.workflowSchedulers?.skillsUpload;
        if (!scheduler) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return submitGithubPreparedPublic(input, scheduler);
      },
    ),
    uploadSkills: protectedProcedure.skills.uploadSkills.handler(({ input, context }) => {
      const scheduler = context.workflowSchedulers?.skillsUpload;
      if (!scheduler) {
        throw new ORPCError("SERVICE_UNAVAILABLE");
      }

      return uploadSkills(input, scheduler);
    }),
  },
  tags: {
    count: publicProcedure.tags.count.handler(() => countTags()),
    getBySlug: publicProcedure.tags.getBySlug.handler(({ input }) => getTagBySlug(input)),
    getTopSkillsBySlug: publicProcedure.tags.getTopSkillsBySlug.handler(({ input }) =>
      getTagTopSkillsBySlug(input),
    ),
    list: publicProcedure.tags.list.handler(({ input }) => listTags(input)),
    listForSeo: publicProcedure.tags.listForSeo.handler(({ input }) =>
      listTagsForSeo(input as { limit?: number } | undefined),
    ),
    listIndexable: publicProcedure.tags.listIndexable.handler(({ input }) =>
      listIndexableTags(input as { limit?: number; minCount?: number } | undefined),
    ),
    listPage: publicProcedure.tags.listPage.handler(({ input }) =>
      listTagsPage(input as { cursor?: string; limit?: number } | undefined),
    ),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
