import type { createNewsletterSubscription, findNewsletterByEmail } from "./repo";
import { createDepGetter } from "../shared/deps";

interface NewsletterServiceDeps {
  createNewsletterSubscription: typeof createNewsletterSubscription;
  findNewsletterByEmail: typeof findNewsletterByEmail;
}

const createDefaultNewsletterDeps = async (): Promise<NewsletterServiceDeps> => {
  const repo = await import("./repo");
  return {
    createNewsletterSubscription: repo.createNewsletterSubscription,
    findNewsletterByEmail: repo.findNewsletterByEmail,
  };
};

export const createNewsletterService = (overrides: Partial<NewsletterServiceDeps> = {}) => {
  let defaultDepsPromise: Promise<NewsletterServiceDeps> | null = null;

  const getDefaultDeps = async () => {
    defaultDepsPromise ??= createDefaultNewsletterDeps();
    return await defaultDepsPromise;
  };

  const getDep = createDepGetter(overrides, getDefaultDeps);

  return {
    async create(input: {
      city?: string | null;
      country?: string | null;
      device?: "mobile" | "desktop" | null;
      email: string;
      ip?: string | null;
    }) {
      const findNewsletterByEmailFn = await getDep("findNewsletterByEmail");
      const existing = await findNewsletterByEmailFn(input.email);
      if (existing) {
        return null;
      }

      const createNewsletterSubscriptionFn = await getDep("createNewsletterSubscription");
      await createNewsletterSubscriptionFn(input);
      return null;
    },
  };
};

export const newsletterService = createNewsletterService();
