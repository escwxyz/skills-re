"use client";

import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

import { m } from "@/paraglide/messages";
import type { SkillTocItem } from "@skills-re/utils";

const ACTIVE_OFFSET = 132;
const BOTTOM_THRESHOLD = 80;

const getScrollState = (containerRef?: RefObject<HTMLElement | null>) => {
  const container = containerRef?.current;

  if (container) {
    return {
      remaining: container.scrollHeight - container.scrollTop - container.clientHeight,
      scrolled: container.scrollTop,
    };
  }

  const scrollingElement = document.scrollingElement ?? document.documentElement;
  return {
    remaining:
      scrollingElement.scrollHeight - scrollingElement.scrollTop - scrollingElement.clientHeight,
    scrolled: scrollingElement.scrollTop,
  };
};

const getActiveSlug = (items: SkillTocItem[], containerRef?: RefObject<HTMLElement | null>) => {
  const root = document.querySelector<HTMLElement>("[data-skill-md-content]");
  if (!root) {
    return null;
  }

  const headings = items
    .map((item) => root.querySelector<HTMLElement>(`#${CSS.escape(item.slug)}`))
    .filter((heading): heading is HTMLElement => heading !== null);

  if (headings.length === 0) {
    return null;
  }

  const { remaining, scrolled } = getScrollState(containerRef);
  if (scrolled > 0 && remaining <= BOTTOM_THRESHOLD) {
    return headings.at(-1)?.id ?? null;
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

interface Props {
  items: SkillTocItem[];
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export const SkillMdToc = ({ items, scrollContainerRef }: Props) => {
  const scroll = useScroll(scrollContainerRef ? { container: scrollContainerRef } : undefined);
  const [activeSlug, setActiveSlug] = useState<string | null>(items[0]?.slug ?? null);

  const syncActiveSlug = useCallback(() => {
    setActiveSlug(getActiveSlug(items, scrollContainerRef));
  }, [scrollContainerRef, items]);

  useEffect(() => {
    syncActiveSlug();

    const onResize = () => {
      syncActiveSlug();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [items, scrollContainerRef, syncActiveSlug]);

  useMotionValueEvent(scroll.scrollY, "change", () => {
    syncActiveSlug();
  });

  return (
    <aside className="hidden self-start font-mono text-[11px] leading-8 tracking-wider lg:sticky lg:top-[calc(var(--header-height)+3.5rem)] lg:block">
      <h6 className="text-muted-foreground mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
        {m.skill_page_toc_header()}
      </h6>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <li key={item.slug}>
              <a
                aria-current={isActive ? "true" : undefined}
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
