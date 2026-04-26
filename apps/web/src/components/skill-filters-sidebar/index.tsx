"use client";

import type { BrowseCategoryItem, BrowseTagItem } from "@/lib/registry-data";

import { cn } from "@/lib/utils";

interface Props {
  activeClass: string;
  categories: BrowseCategoryItem[];
  onClassChange: (id: string) => void;
  activeTags: Set<string>;
  tags: BrowseTagItem[];
  onTagToggle: (tag: string) => void;
  className?: string;
}

export const SkillFiltersSidebar = ({
  activeClass,
  categories,
  onClassChange,
  activeTags,
  tags,
  onTagToggle,
  className,
}: Props) => (
  <aside
    className={cn(
      "sticky top-(--header-height) hidden h-[calc(100svh-var(--header-height))] w-65 shrink-0 overflow-y-auto border-r border-rule bg-paper lg:block",
      className,
    )}
  >
    <div>
      <div className="border-rule border-b px-5 py-4.5 font-mono text-[10.5px] tracking-[.18em] uppercase text-muted-text">
        Classification
      </div>
      <div className="border-rule border-b px-5 py-4.5">
        {categories.map((item) => (
          <label
            key={item.id}
            className={`mb-0 flex cursor-pointer justify-between py-1 font-mono text-[11.5px] normal-case tracking-normal ${
              activeClass === item.id ? "text-ink" : "text-ink-2"
            }`}
          >
            <span>
              <input
                type="checkbox"
                checked={activeClass === item.id}
                onChange={() => onClassChange(activeClass === item.id ? "all" : item.id)}
                style={{ marginRight: "8px", width: "auto" }}
              />
              {item.title}
            </span>
            <span className="text-muted-text">{item.countLabel}</span>
          </label>
        ))}
      </div>
    </div>

    <div>
      <div className="border-rule border-b px-5 py-4.5 font-mono text-[10.5px] tracking-[.18em] uppercase text-muted-text">
        Tags
      </div>
      <div className="border-rule border-b px-5 py-4.5">
        <div className="flex flex-wrap gap-1.25">
          {tags.map((tag) => (
            <button
              key={tag.slug}
              onClick={() => onTagToggle(tag.slug)}
              className={`cursor-pointer border border-rule px-1.75 py-0.75 font-mono text-[10px] tracking-[.08em] uppercase ${
                activeTags.has(tag.slug) ? "bg-ink text-paper" : "bg-transparent text-ink"
              }`}
            >
              {tag.slug}
            </button>
          ))}
        </div>
      </div>
    </div>
  </aside>
);
