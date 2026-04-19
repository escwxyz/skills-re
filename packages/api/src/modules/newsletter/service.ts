import type { createNewsletterSubscription, findNewsletterByEmail } from "./repo";

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

  return {
    async create(input: {
      city?: string | null;
      country?: string | null;
      device?: "mobile" | "desktop" | null;
      email: string;
      ip?: string | null;
    }) {
      const findNewsletterByEmailFn =
        overrides.findNewsletterByEmail ?? (await getDefaultDeps()).findNewsletterByEmail;
      const existing = await findNewsletterByEmailFn(input.email);
      if (existing) {
        return null;
      }

      const createNewsletterSubscriptionFn =
        overrides.createNewsletterSubscription ??
        (await getDefaultDeps()).createNewsletterSubscription;
      await createNewsletterSubscriptionFn(input);
      return null;
    },
  };
};

export const newsletterService = createNewsletterService();
