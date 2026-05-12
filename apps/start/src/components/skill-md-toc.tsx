import { m } from "@/paraglide/messages";
import type { SkillTocItem } from "@skills-re/utils";

export const SkillMdToc = ({ items }: { items: SkillTocItem[] }) => (
  <aside className="hidden self-start font-mono text-[11px] leading-8 tracking-wider lg:sticky lg:top-24 lg:block">
    <h6 className="text-muted-foreground mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
      {m.skill_page_toc_header()}
    </h6>
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={`${item.slug}-${index}`}>
          <a
            className={[
              "block",
              index === 0 ? "-ml-3 border-l-2 border-ink pl-2.5 text-ink" : "text-ink-2",
            ].join(" ")}
            href={`#${item.slug}`}
          >
            {`§ ${item.title}`}
          </a>
        </li>
      ))}
    </ul>
  </aside>
);
