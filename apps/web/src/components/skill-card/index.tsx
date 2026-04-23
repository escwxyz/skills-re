import type { SkillCardItem } from "@/lib/registry-data";

import SkillCardAstro from "./skill-card.astro";

export { SkillCardAstro };

interface LegacySkillCard {
  auditScore?: number;
  classification: string;
  description: string;
  publisherName: string;
  slug: string;
  stars: number;
  tags: string[];
  title: string;
  version: string;
}

type SkillCardProps = LegacySkillCard | SkillCardItem;

const isCatalogSkillCard = (skill: SkillCardProps): skill is SkillCardItem =>
  "categoryLabel" in skill;

interface Props {
  skill: SkillCardProps;
}

export const SkillCard = ({ skill }: Props) => {
  const categoryLabel = isCatalogSkillCard(skill) ? skill.categoryLabel : skill.classification;
  const badgeLabel = isCatalogSkillCard(skill) ? skill.badgeLabel : `v${skill.version}`;
  const authorLabel = isCatalogSkillCard(skill) ? skill.authorLabel : skill.publisherName;
  const starsLabel = isCatalogSkillCard(skill) ? skill.starsLabel : String(skill.stars);
  const { auditScore } = skill;
  const initial = authorLabel.charAt(0).toUpperCase();

  return (
    <a
      href={`/skills/${skill.slug}`}
      className="flex h-full flex-col border-b border-r border-rule p-5 hover:bg-paper-2 transition-colors"
    >
      {/* Top meta */}
      <div className="flex items-center justify-between mb-3 font-mono text-[10px] tracking-[.14em] uppercase">
        <span className="text-muted-text">{categoryLabel}</span>
        {badgeLabel ? <span className="text-muted-text">{badgeLabel}</span> : null}
      </div>

      {/* Title */}
      <h4 className="font-display text-[22px] leading-[1.1] font-normal mb-2">{skill.title}</h4>

      {/* Description */}
      <p className="font-serif text-[13px] leading-normal text-ink-2 mb-4 line-clamp-3">
        {skill.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4 mt-auto">
        {skill.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="font-mono text-[9px] tracking-[.08em] uppercase px-1.5 py-0.5 border border-rule text-muted-text"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-rule pt-3">
        <div className="flex items-center gap-2">
          <div className="flex size-5 shrink-0 items-center justify-center bg-ink font-mono text-[9px] text-paper">
            {initial}
          </div>
          <span className="font-mono text-[10px] text-muted-text truncate max-w-30">
            {authorLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-widest uppercase shrink-0">
          {starsLabel ? (
            <span className="text-muted-text">
              ★ <b className="text-ink font-medium">{starsLabel}</b>
            </span>
          ) : null}
          {typeof auditScore === "number" ? (
            <span className="text-muted-text">
              Audit <b className="text-ink font-medium">{auditScore}</b>
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
};
