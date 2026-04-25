import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";

import { adminProcedure, protectedProcedure, publicProcedure } from "../procedures";
import {
  checkDuplicatedRepo,
  checkExistingRepo,
  enqueueRepoStatsSync,
  checkExistingSkill,
  aiSearch,
  addSkillToCollection,
  countCategories,
  countCollections,
  createCollection,
  createFeedbackRecord,
  createReviewRecord,
  newsletterService,
  deleteCollection,
  getFeedbackById,
  getMineFeedbackById,
  getMyReviewBySkill,
  getCollectionBySlug,
  countSkills,
  countTags,
  claimAsAuthor,
  getAuthorByHandle,
  getBasicSkill,
  getCategoryBySlug,
  getBySkillAndVersion,
  getSkillByPath,
  getSkillsHistoryInfo,
  getSnapshotDownloadManifest,
  getSnapshotFileSignedUrl,
  getSnapshotTreeEntries,
  getTagBySlug,
  listAuthors,
  listCategories,
  listCategoriesForAi,
  listCollections,
  listFeedback,
  listMineFeedback,
  listIndexableTags,
  listReposPage,
  listReviewsBySkill,
  listSnapshotsBySkill,
  listSkills,
  listTags,
  listTagsForSeo,
  fetchGithubRepo,
  dailySkillsSnapshots,
  refreshDailySkillsSnapshots,
  getStaticAuditReportBySnapshot,
  removeSkillFromCollection,
  resolvePathBySlug,
  setCollectionSkills,
  syncRepoStats,
  updateCollection,
  updateRepoStats,
  updateFeedbackResponse,
  updateFeedbackStatus,
  submitGithubRepoPublic,
  uploadSnapshotFiles,
  readSnapshotFileContent,
  uploadSkills,
  searchSkills,
} from "../modules";

const DUPLICATE_REVIEW_MESSAGE = "You have already reviewed this skill.";

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

export const appRouter = {
  healthCheck: publicProcedure.healthCheck.handler(() => "OK"),
  categories: {
    count: publicProcedure.categories.count.handler(() => countCategories()),
    getBySlug: publicProcedure.categories.getBySlug.handler(({ input }) =>
      getCategoryBySlug(input),
    ),
    list: publicProcedure.categories.list.handler(({ input }) => listCategories(input)),
    listForAi: publicProcedure.categories.listForAi.handler(({ input }) =>
      listCategoriesForAi(input as { limit?: number } | undefined),
    ),
  },
  collections: {
    count: publicProcedure.collections.count.handler(() => countCollections()),
    getBySlug: publicProcedure.collections.getBySlug.handler(({ input }) =>
      getCollectionBySlug(input),
    ),
    list: publicProcedure.collections.list.handler(({ input }) => listCollections(input)),
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
    create: protectedProcedure.feedback.create.handler(({ input, context }) =>
      createFeedbackRecord({
        content: input.content,
        title: input.title,
        type: input.type,
        userId: context.session.user.id,
      }),
    ),
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
    create: protectedProcedure.reviews.create.handler(async ({ input, context }) => {
      try {
        return await createReviewRecord({
          content: input.content,
          rating: input.rating,
          skillId: input.skillId,
          userId: context.session.user.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Create review failed.";
        if (message === DUPLICATE_REVIEW_MESSAGE || isUniqueConstraintError(error)) {
          throw new ORPCError("CONFLICT", { message: DUPLICATE_REVIEW_MESSAGE });
        }

        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Create review failed.",
        });
      }
    }),
    getMineBySkill: protectedProcedure.reviews.getMineBySkill.handler(({ input, context }) =>
      getMyReviewBySkill({
        skillId: input.skillId,
        userId: context.session.user.id,
      }),
    ),
    listBySkill: publicProcedure.reviews.listBySkill.handler(({ input }) =>
      listReviewsBySkill(input),
    ),
  },
  newsletter: {
    create: publicProcedure.newsletter.create.handler(({ input }) =>
      newsletterService.create(input),
    ),
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
  metrics: {
    dailySkillsSnapshots: publicProcedure.metrics.dailySkillsSnapshots.handler(({ input }) =>
      dailySkillsSnapshots(input),
    ),
    refreshDailySkillsSnapshots: adminProcedure.metrics.refreshDailySkillsSnapshots.handler(
      ({ input }) => refreshDailySkillsSnapshots(input),
    ),
  },
  staticAudits: {
    getReportBySnapshot: publicProcedure.staticAudits.getReportBySnapshot.handler(({ input }) =>
      getStaticAuditReportBySnapshot(input.snapshotId),
    ),
  },
  repos: {
    checkDuplicated: publicProcedure.repos.checkDuplicated.handler(({ input }) =>
      checkDuplicatedRepo(input),
    ),
    checkExisting: publicProcedure.repos.checkExisting.handler(({ input }) =>
      checkExistingRepo(input),
    ),
    listPage: publicProcedure.repos.listPage.handler(({ input }) => listReposPage(input)),
    updateStats: adminProcedure.repos.updateStats.handler(({ input }) => updateRepoStats(input)),
    syncStats: adminProcedure.repos.syncStats.handler(({ input }) => syncRepoStats(input)),
    enqueueRepoStatsSync: adminProcedure.repos.enqueueRepoStatsSync.handler(
      ({ input, context }) => {
        const scheduler = context.workflowSchedulers?.repoStatsSync;
        if (!scheduler) {
          throw new ORPCError("SERVICE_UNAVAILABLE");
        }

        return enqueueRepoStatsSync(scheduler, input);
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
      ({ input }) => getSnapshotFileSignedUrl(input),
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
      ({ input }) => readSnapshotFileContent(input),
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
    listAuthors: publicProcedure.skills.listAuthors.handler(() => listAuthors()),
    aiSearch: publicProcedure.skills.aiSearch.handler(({ input, context }) =>
      aiSearch(input, context.aiSearch),
    ),
    search: publicProcedure.skills.search.handler(({ input, context }) =>
      searchSkills(input, context.aiSearch),
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
    list: publicProcedure.tags.list.handler(({ input }) => listTags(input)),
    listForSeo: publicProcedure.tags.listForSeo.handler(({ input }) =>
      listTagsForSeo(input as { limit?: number } | undefined),
    ),
    listIndexable: publicProcedure.tags.listIndexable.handler(({ input }) =>
      listIndexableTags(input as { limit?: number; minCount?: number } | undefined),
    ),
  },
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
