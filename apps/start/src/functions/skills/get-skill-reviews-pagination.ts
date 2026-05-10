import { createServerFn } from "@tanstack/react-start";
import { resolveSkillBase } from "./skills.server";
import { z } from "zod/v4";
import { createServerORPCClient } from "@/lib/orpc.server";

import { splitLegacyReviewContent } from "@/view-models/split-legacy-review-content";

export const getSkillReviewsPagination = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      cursor: z.string().optional(),
      slug: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const skill = await resolveSkillBase(data.slug);
    if (!skill) {
      return { nextCursor: null, reviews: [] };
    }

    const client = createServerORPCClient();
    const result = await client.reviews.listBySkill({
      cursor: data.cursor,
      limit: 10,
      skillId: skill.id,
    });

    return {
      nextCursor: result.nextCursor ?? null,
      reviews: result.items.map((review) => {
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
    };
  });
