import { createServerORPCClient } from "@/lib/orpc.server";

export const fetchDashboardPageData = async () => {
  const client = createServerORPCClient();

  const [skills, savedSkills, feedback, feedbackCount, reviews, reviewCount] = await Promise.all([
    client.skills.listMine({ limit: 100 }),
    client.skills.listMineSaved({ limit: 100 }),
    client.feedback.listMine({ limit: 100 }),
    client.feedback.countMine({}),
    client.reviews.listMine({ limit: 100 }),
    client.reviews.countMine({}),
  ]);

  return {
    feedback,
    feedbackCount,
    reviewCount,
    reviews,
    savedSkills,
    skills,
  };
};
