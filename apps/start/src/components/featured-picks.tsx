import { Link } from "@tanstack/react-router";

import { buildSkillDetailPath } from "@/lib/skill-path";
import {
  featured_picks_eyebrow,
  featured_picks_editors_picks,
  featured_picks_feature_screenshot,
  featured_picks_unexpectedly_legible,
} from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { formatCompactNumber } from "@/utils/format";
import type { BrowseSkillItem } from "@/utils/types";

interface Props {
  picks: BrowseSkillItem[];
}
// todo i18n
export const FeaturedPicks = ({ picks }: Props) => {
  const locale = getLocale();
  const [featured, ...rest] = picks;

  if (!featured) {
    return null;
  }

  const featuredVersionLabel = featured.latestVersion ? `v${featured.latestVersion}` : "latest";
  const featuredInstallsLabel = formatCompactNumber(featured.downloadsAllTime ?? 0, locale);

  return (
    <section className="grid grid-cols-1 border-b-[3px] border-border md:grid-cols-[1.2fr_1fr]">
      <div className="border-b border-border py-7 md:border-b-0 md:border-r md:pr-8">
        <div className="mb-2 font-mono text-[10.5px] tracking-[.2em] uppercase text-destructive">
          {featured_picks_eyebrow()}
        </div>
        <h3 className="font-display m-0 mb-3.5 text-[clamp(36px,4vw,54px)] font-normal italic leading-none">
          {featured.title},
          <br />
          {featured_picks_unexpectedly_legible()}
        </h3>
        <p className="font-serif text-[18px] leading-normal text-muted-foreground">
          {featured.description}
        </p>
        <div className="mt-4 font-mono text-[10.5px] tracking-[.14em] uppercase text-muted-foreground">
          {featuredVersionLabel} · installs{" "}
          <b className="font-medium text-foreground">{featuredInstallsLabel}</b>
        </div>
        <div className="ph mt-4.5 aspect-video border border-border bg-muted">
          <span className="ph-label">
            {featured_picks_feature_screenshot()} — {featured.title}
          </span>
        </div>
      </div>

      <div className="py-7 md:pl-8">
        <h5 className="m-0 mb-3.5 font-mono text-[10.5px] tracking-[.2em] uppercase text-foreground">
          {featured_picks_editors_picks()}
        </h5>
        {rest.map((skill, i) => (
          <Link
            key={skill.id}
            to={buildSkillDetailPath({
              authorHandle: skill.authorHandle ?? skill.author?.handle,
              repoName: skill.repoName ?? "unknown-repo",
              skillSlug: skill.slug,
            })}
            className="grid grid-cols-[40px_1fr_auto] items-start gap-3.5 border-t border-border py-3.5 no-underline hover:no-underline"
          >
            <div className="font-display text-[34px] leading-none text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                <b className="font-medium text-foreground">
                  {skill.latestVersion ? `v${skill.latestVersion}` : "latest"}
                </b>
              </div>
              <div className="font-display my-0.5 mb-1 text-[22px] leading-[1.1]">
                {skill.title}
              </div>
              <div className="font-serif text-[13px] leading-[1.4] text-muted-foreground">
                {skill.description}
              </div>
            </div>
            <div className="text-right font-mono text-[10.5px] tracking-wider text-muted-foreground">
              INSTALLS
              <b className="block font-medium text-foreground text-[13px]">
                {formatCompactNumber(skill.downloadsAllTime ?? 0, locale)}
              </b>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
