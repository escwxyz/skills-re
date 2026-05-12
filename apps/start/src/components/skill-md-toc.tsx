"use client";

import { useEffect, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

import { m } from "@/paraglide/messages";
import type { SkillTocItem } from "@skills-re/utils";

const ACTIVE_OFFSET = 132;

const getActiveSlug = (items: SkillTocItem[]) => {
  const root = document.querySelector<HTMLElement>("[data-skill-md-content]");
  if (!root) {
    return null;
  }

  const headings = items
    .map((item) => root.querySelector<HTMLElement>(`#${item.slug}`))
    .filter((heading): heading is HTMLElement => heading !== null);

  if (headings.length === 0) {
    return null;
  }

  let activeSlug = headings[0]?.id ?? null;

  for (const heading of headings) {
    if (heading.getBoundingClientRect().top <= ACTIVE_OFFSET) {
      activeSlug = heading.id;
      continue;
    }
    break;
  }

  return activeSlug;
};

export const SkillMdToc = ({ items }: { items: SkillTocItem[] }) => {
  const { scrollY } = useScroll();
  const [activeSlug, setActiveSlug] = useState<string | null>(items[0]?.slug ?? null);

  useEffect(() => {
    setActiveSlug(getActiveSlug(items));

    const onResize = () => {
      setActiveSlug(getActiveSlug(items));
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [items]);

  useMotionValueEvent(scrollY, "change", () => {
    setActiveSlug(getActiveSlug(items));
  });

  return (
    <aside className="hidden self-start font-mono text-[11px] leading-8 tracking-wider lg:sticky lg:top-24 lg:block">
      <h6 className="text-muted-foreground mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
        {m.skill_page_toc_header()}
      </h6>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <li key={item.slug}>
              <a
                className={[
                  "block transition-colors",
                  isActive
                    ? "-ml-3 border-l-2 border-ink pl-2.5 text-ink"
                    : "text-ink-2 hover:text-ink",
                ].join(" ")}
                href={`#${item.slug}`}
              >
                {`§ ${item.title}`}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
