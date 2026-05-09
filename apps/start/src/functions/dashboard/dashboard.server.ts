import { createServerORPCClient } from "@/lib/orpc.server";

export const fetchDashboardPageData = async () => {
  const client = createServerORPCClient();

  const [skills, savedSkillsPage, feedback, feedbackCount, reviews, reviewCount] =
    await Promise.all([
      client.skills.listMine({ limit: 10 }),
      client.skills.listMineSaved({ limit: 10 }),
      client.feedback.listMine({ limit: 10 }),
      client.feedback.countMine({}),
      client.reviews.listMine({ limit: 10 }),
      client.reviews.countMine({}),
    ]);

  return {
    feedback,
    feedbackCount,
    reviewCount,
    reviews,
    savedSkills: savedSkillsPage.page,
    skills,
  };
};
