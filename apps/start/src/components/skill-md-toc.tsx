"use client";

import { useState } from "react";
import type { RefObject } from "react";

import { ScrollSpy, ScrollSpyLink } from "@/components/ui/scroll-spy";
import { m } from "@/paraglide/messages";
import type { SkillTocItem } from "@skills-re/utils";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";

const ACTIVE_OFFSET = 132;

interface Props {
  items: SkillTocItem[];
  scrollContainerRef?: RefObject<HTMLElement | null>;
}

export const SkillMdToc = ({ items, scrollContainerRef }: Props) => {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    setScrollContainer(scrollContainerRef?.current ?? null);
  });

  return (
    <ScrollSpy
      defaultValue={items[0]?.slug}
      offset={ACTIVE_OFFSET}
      scrollContainer={scrollContainer}
      className="hidden self-start font-mono text-[11px] leading-8 tracking-wider lg:sticky lg:top-[calc(var(--header-height)+3.5rem)] lg:block"
    >
      <aside>
        <h6 className="text-muted-foreground mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em]">
          {m.skill_page_toc_header()}
        </h6>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.slug}>
              <ScrollSpyLink
                className={[
                  "block transition-colors",
                  "text-ink-2 hover:text-ink",
                  "data-[state=active]:-ml-3 data-[state=active]:border-l-2 data-[state=active]:border-ink data-[state=active]:pl-2.5 data-[state=active]:text-ink",
                ].join(" ")}
                href={`#${item.slug}`}
                value={item.slug}
              >
                {`#${item.title}`}
              </ScrollSpyLink>
            </li>
          ))}
        </ul>
      </aside>
    </ScrollSpy>
  );
};
