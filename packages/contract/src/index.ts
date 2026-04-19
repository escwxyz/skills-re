import { z } from "zod";

import { baseContract } from "./common/base";
import { categoriesContract } from "./categories";
import { changelogsContract } from "./changelogs";
import { feedbackContract } from "./feedback";
import { githubContract } from "./github";
import { metricsContract } from "./metrics";
import { newsletterContract } from "./newsletter";
import { reviewsContract } from "./reviews";
import { reposContract } from "./repos";
import { staticAuditsContract } from "./static-audits";
import { snapshotsContract } from "./snapshots";
import { skillsContract } from "./skills";
import { tagsContract } from "./tags";

export const healthResponseSchema = z.literal("OK");

const healthCheckContract = baseContract
  .route({
    description: "Returns a minimal status payload used for uptime checks and API documentation.",
    method: "GET",
    path: "/health",
    tags: ["Health"],
    successDescription: "Service is healthy",
    summary: "Check service health",
  })
  .output(healthResponseSchema);

export const contract = {
  healthCheck: healthCheckContract,
  categories: categoriesContract,
  changelogs: changelogsContract,
  feedback: feedbackContract,
  github: githubContract,
  metrics: metricsContract,
  newsletter: newsletterContract,
  reviews: reviewsContract,
  repos: reposContract,
  staticAudits: staticAuditsContract,
  snapshots: snapshotsContract,
  skills: skillsContract,
  tags: tagsContract,
} as const;

export type AppContract = typeof contract;
