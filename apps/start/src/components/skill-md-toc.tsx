import { m } from "@/paraglide/messages";

export const SkillMdToc = ({ items }: { items: string[] }) => (
  <aside className="hidden self-start font-mono text-[11px] leading-8 tracking-wider lg:sticky lg:top-17.5 lg:block">
    <h6 className="text-muted-foreground mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
      {m.skill_page_toc_header()}
    </h6>
    <ul className="space-y-0.5">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>
          <a
            className={[
              "block",
              index === 0 ? "-ml-3 border-l-2 border-ink pl-2.5 text-ink" : "text-ink-2",
            ].join(" ")}
            href={`#s${String(index + 1).padStart(2, "0")}`}
          >
            {`§ ${String(index + 1).padStart(2, "0")} ${item}`}
          </a>
        </li>
      ))}
    </ul>
  </aside>
);
