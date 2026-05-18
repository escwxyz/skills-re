import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { CollectionItem } from "@/components/collection-item";
import { getCollectionDetail } from "@/functions/collections/get-collection-detail";
import { buildCollectionOgImagePath } from "@/lib/og-image-paths";
import { createSeo } from "@/lib/seo";
import {
  collections_page_all_collections,
  collections_page_editors_note,
  collections_page_end_of_collection,
  collections_page_eyebrow,
  collections_page_in_this_collection,
  collections_page_intro_1,
  collections_page_intro_2,
  collections_page_intro_3,
  collections_page_license_mix,
  collections_page_mount_all,
  collections_page_passing,
  collections_page_skills,
  collections_page_thanks_for_reading,
  collections_page_total_downloads,
  collections_page_total_file_size,
  collections_page_working_collection,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import {
  formatCollectionLicenseMix,
  formatCollectionPassRate,
  formatCollectionSkillPassRate,
  formatCollectionTotalDownloads,
  formatCollectionTotalFileSize,
} from "@/utils/collection-data";
import { formatCompactNumber } from "@/utils/format";

export const Route = createFileRoute("/_publicLayout/collections/$slug")({
  loader: ({ params }) => getCollectionDetail({ data: { slug: params.slug } }),
  head: ({ loaderData }) =>
    createSeo({
      canonicalPath: loaderData ? `/collections/${loaderData.slug}` : "/collections",
      description: loaderData?.description,
      image: loaderData ? buildCollectionOgImagePath(loaderData.slug) : undefined,
      title: loaderData?.title,
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  if (!data) {
    throw notFound();
  }

  const locale = getLocale();
  const skills = data.skills.map((skill) => ({
    authorHandle: skill.authorHandle ?? skill.author?.handle ?? "unknown-author",
    description: skill.description,
    id: skill.id,
    installs:
      typeof skill.downloadsAllTime === "number"
        ? formatCompactNumber(skill.downloadsAllTime, locale)
        : "—",
    passRate: formatCollectionSkillPassRate(skill),
    publisherName: skill.author?.name ?? skill.authorHandle ?? "—",
    repoName: skill.repoName ?? "",
    slug: skill.slug,
    tags: skill.tags ?? [],
    title: skill.title,
    version: skill.latestVersion ?? "—",
  }));
  const licenseMix = formatCollectionLicenseMix(data.skills);
  const passingSkills = formatCollectionPassRate(data.skills);
  const totalDownloads = formatCollectionTotalDownloads(data.skills, locale);
  const totalFileSize = formatCollectionTotalFileSize(data.skills);

  const metaItems = [
    { lbl: String(collections_page_skills()), val: String(skills.length) },
    { lbl: String(collections_page_total_downloads()), val: totalDownloads },
    { lbl: String(collections_page_license_mix()), val: licenseMix },
    { lbl: String(collections_page_total_file_size()), val: totalFileSize },
    { lbl: String(collections_page_passing()), val: passingSkills, accent: true },
  ];

  return (
    <>
      {/* Hero */}
      <section className="border-border border-b px-5 py-10 md:px-10 md:py-16">
        <div className="text-destructive mb-4 font-mono text-[10.5px] tracking-[.2em] uppercase">
          ● {collections_page_eyebrow({ slug: data.slug })}
        </div>
        <h1 className="font-display m-0 mb-5 text-[clamp(2.8rem,8vw,7rem)] leading-[.88] font-normal tracking-tight">
          {data.title}
        </h1>
        <p className="text-muted-foreground m-0 max-w-3xl font-serif text-[clamp(1rem,2vw,1.4rem)] leading-relaxed">
          {data.description}
        </p>
      </section>

      {/* Meta bar */}
      <div className="border-border grid grid-cols-2 border-b-[3px] font-mono text-[10.5px] tracking-widest uppercase sm:grid-cols-3 md:grid-cols-5">
        {metaItems.map((item, i) => (
          <div
            key={item.lbl}
            className={`border-border text-muted-foreground border-r px-4 py-3.5 last:border-r-0${i === 1 ? " sm:border-r-0 md:border-r" : ""}`}
          >
            {item.lbl}
            <b
              className={`font-display mt-1 block text-base font-medium${item.accent ? " text-editorial-green" : " text-foreground"}`}
            >
              {item.val}
            </b>
          </div>
        ))}
      </div>

      {/* Editorial intro */}
      <section className="border-border grid grid-cols-1 border-b md:grid-cols-[1fr_2fr] lg:grid-cols-3">
        <aside className="border-border border-b px-5 py-8 font-mono text-[11px] leading-relaxed text-muted-foreground md:border-r md:border-b-0 md:px-7">
          <b className="text-foreground mb-1.5 block font-medium tracking-widest uppercase">
            {collections_page_editors_note()}
          </b>
          {collections_page_working_collection()}
          <br />
          <br />
          <b className="text-foreground mb-1.5 block font-medium tracking-widest uppercase">
            {collections_page_mount_all()}
          </b>
          <span className="text-foreground break-all tracking-wider">
            skr install @skills.re/{data.slug}
          </span>
        </aside>

        <div className="border-border border-b px-5 py-8 font-serif text-[17px] leading-[1.6] md:px-8 lg:border-r lg:border-b-0">
          <p className="m-0 mb-4">{collections_page_intro_1()}</p>
          <p className="m-0 mb-4">{collections_page_intro_2()}</p>
          <p className="m-0">{collections_page_intro_3()}</p>
        </div>

        <aside className="hidden px-5 py-8 font-mono text-[11px] leading-relaxed text-muted-foreground md:px-7 lg:block">
          <b className="text-foreground mb-1.5 block font-medium tracking-widest uppercase">
            {collections_page_in_this_collection()}
          </b>
          <div className="mt-2 leading-loose">
            {skills.map((s, i) => (
              <div key={s.id} className="truncate">
                {String(i + 1).padStart(2, "0")} · {s.title}
              </div>
            ))}
          </div>
        </aside>
      </section>

      {/* Skills list */}
      {skills.map((skill, i) => (
        <CollectionItem key={skill.id} skill={skill} index={i} />
      ))}

      {/* Tail */}
      <div className="border-border border-b px-5 py-12 text-center">
        <div className="text-muted-foreground font-mono text-[11px] tracking-[.16em] uppercase">
          {collections_page_end_of_collection()}
        </div>
        <div className="font-display my-2 text-[32px] italic">— skills.re</div>
        <div className="text-muted-foreground font-mono text-[11px] tracking-[.16em] uppercase">
          {collections_page_thanks_for_reading()}
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            to="/collections"
            className="border-border hover:bg-muted rounded-none border px-4 py-2 font-mono text-[10.5px] tracking-[.14em] uppercase transition-colors"
          >
            <ArrowLeftIcon /> {collections_page_all_collections()}
          </Link>
        </div>
      </div>
    </>
  );
}
