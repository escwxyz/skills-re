import { createServerORPCClient } from "@/lib/orpc.server";
import {
  formatCollectionLicenseMix,
  formatCollectionPassRate,
  formatCollectionSkillPassRate,
  formatCollectionTotalDownloads,
  formatCollectionTotalFileSize,
} from "@/utils/collection-data";
import { formatCompactNumber } from "@/utils/format";
import type { Locale } from "@/paraglide/runtime";

export const fetchCollectionsListPageData = async () => {
  const client = createServerORPCClient();
  const { page: collections } = await client.collections.list({ limit: 100 });
  return {
    collections,
  };
};

export const fetchCollectionDetailPageData = async (slug: string, locale: Locale) => {
  const client = createServerORPCClient();
  const collection = await client.collections.getBySlug({ slug });

  if (!collection) {
    return null;
  }

  const rawSkills = collection.skills;

  const skills = rawSkills.map((s) => ({
    description: s.description,
    id: s.id,
    installs:
      typeof s.downloadsAllTime === "number"
        ? formatCompactNumber(s.downloadsAllTime, locale)
        : "—",
    passRate: formatCollectionSkillPassRate(s),
    publisherName: s.author?.name ?? s.authorHandle ?? "—",
    slug: s.slug,
    tags: s.tags ?? [],
    title: s.title,
    version: s.latestVersion ?? "—",
  }));

  return {
    description: collection.description,
    licenseMix: formatCollectionLicenseMix(rawSkills),
    passingSkills: formatCollectionPassRate(rawSkills),
    skills,
    slug: collection.slug,
    title: collection.title,
    totalDownloads: formatCollectionTotalDownloads(rawSkills, locale),
    totalFileSize: formatCollectionTotalFileSize(rawSkills),
  };
};
