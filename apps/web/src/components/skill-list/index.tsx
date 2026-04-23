import type { BrowseSkillItem } from "@/lib/registry-data";

const DESKTOP_COLS = "grid-cols-[2rem_minmax(0,1.4fr)_minmax(0,2.4fr)_repeat(4,minmax(0,1fr))]";

interface Props {
  skills: BrowseSkillItem[];
}

export const SkillList = ({ skills }: Props) => (
  <div>
    <div
      className={`hidden md:grid ${DESKTOP_COLS} gap-4 border-b border-rule bg-paper-2 px-6 py-3 font-mono text-[10px] tracking-[.14em] uppercase text-muted-text`}
    >
      <div>#</div>
      <div>Skill</div>
      <div>Description</div>
      <div>Category</div>
      <div>Installs</div>
      <div>Audit</div>
      <div>Stars</div>
      <div>Version</div>
    </div>

    {skills.map((skill, index) => {
      const initial = skill.authorLabel.charAt(0).toUpperCase();

      return (
        <a
          key={skill.id}
          href={`/skills/${skill.slug}`}
          className="block border-b border-rule transition-colors hover:bg-paper-2"
        >
          <div className="p-5 md:hidden">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[.14em] uppercase">
              <span className="text-muted-text">{skill.categoryLabel}</span>
              <span className="text-muted-text">{skill.latestVersionLabel}</span>
            </div>

            <h4 className="mb-1.5 font-display text-[22px] leading-[1.1] font-normal">
              {skill.title}
            </h4>

            <p className="mb-3 line-clamp-2 font-serif text-[13px] leading-normal text-ink-2">
              {skill.description}
            </p>

            <div className="mb-3 flex flex-wrap gap-1">
              {skill.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="border border-rule px-1.5 py-0.5 font-mono text-[9px] tracking-[.08em] uppercase text-muted-text"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-rule pt-3">
              <div className="flex items-center gap-2">
                <div className="flex size-5 shrink-0 items-center justify-center bg-ink font-mono text-[9px] text-paper">
                  {initial}
                </div>
                <span className="max-w-30 truncate font-mono text-[10px] text-muted-text">
                  {skill.authorLabel}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] tracking-widest uppercase">
                <span className="text-muted-text">
                  DL <b className="font-medium text-ink">{skill.downloadsLabel}</b>
                </span>
                {skill.starsLabel ? (
                  <span className="text-muted-text">
                    ★ <b className="font-medium text-ink">{skill.starsLabel}</b>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className={`hidden md:grid ${DESKTOP_COLS} items-center gap-4 px-6 py-4`}>
            <div className="font-mono text-[10px] tracking-widest text-muted-text">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div>
              <div className="font-display text-[18px] leading-tight">{skill.title}</div>
              <div className="mt-0.5 font-mono text-[9px] tracking-[.12em] uppercase text-muted-text">
                {skill.id}
              </div>
            </div>

            <div className="line-clamp-2 font-serif text-[12px] text-ink-2">
              {skill.description}
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-text">
              <b className="block text-[12px] font-medium text-ink">{skill.categoryLabel}</b>
              category
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-text">
              <b className="block text-[12px] font-medium text-ink">{skill.downloadsLabel}</b>
              installs
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-text">
              <b className="block text-[12px] font-medium text-ink">{skill.auditScore ?? "—"}</b>
              audit
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-text">
              <b className="block text-[12px] font-medium text-ink">{skill.starsLabel ?? "—"}</b>
              stars
            </div>

            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-text">
              <b className="block text-[12px] font-medium text-ink">{skill.latestVersionLabel}</b>
              version
            </div>
          </div>
        </a>
      );
    })}
  </div>
);
