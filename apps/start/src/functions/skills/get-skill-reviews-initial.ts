import { createServerFn } from "@tanstack/react-start";
import { resolveSkillBase } from "./skills.server";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";
import { splitLegacyReviewContent } from "@/view-models/split-legacy-review-content";

export const getSkillReviewsInitialPage = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const skill = await resolveSkillBase(data.slug);
    if (!skill) {
      return null;
    }

    const client = createServerORPCClient();
    const [stats, firstPage] = await Promise.all([
      client.reviews.statsBySkill({ skillId: skill.id }),
      client.reviews.listBySkill({ limit: 10, skillId: skill.id }),
    ]);

    return {
      nextCursor: firstPage.nextCursor ?? null,
      ratingAvg: stats.ratingAvg,
      ratingCounts: ([5, 4, 3, 2, 1] as const).map((stars) => ({
        count: stats.ratingCounts[stars],
        stars,
      })),
      recommendPct: stats.recommendPct,
      reviews: firstPage.items.map((review) => {
        const normalizedReview = splitLegacyReviewContent(review.content, review.title);
        return {
          authorName: review.author.name,
          body: normalizedReview.body,
          createdAt: review.createdAt,
          id: review.id,
          stars: review.rating,
          title: normalizedReview.title,
          versionLabel: skill.latestVersion ? `v${skill.latestVersion}` : undefined,
        };
      }),
      skillDescription: skill.description,
      skillId: skill.id,
      skillTitle: skill.title,
      totalReviews: stats.totalReviews,
    };
  });
