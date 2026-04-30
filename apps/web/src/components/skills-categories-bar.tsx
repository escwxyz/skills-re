"use client";

import type { BrowseCategoryItem } from "@/lib/registry-data";

interface Props {
  activeClass: string;
  categories: BrowseCategoryItem[];
  onClassChange: (id: string) => void;
}

export function SkillsCategoriesBar({ activeClass, categories, onClassChange }: Props) {
  const items = [
    { id: "all", num: "00 / all", title: "The Index" },
    ...categories.map((category) => ({
      id: category.id,
      num: category.num,
      title: category.title,
    })),
  ];

  return (
    <nav
      className="hidden border-b border-rule md:grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((cls) => (
        <button
          key={cls.id}
          onClick={() => onClassChange(cls.id)}
          className={`border-0 border-r border-rule p-3.5 cursor-pointer text-left font-mono text-[10.5px] tracking-[.14em] uppercase ${
            activeClass === cls.id ? "bg-ink text-paper" : "bg-transparent text-muted-text"
          }`}
        >
          <span className="block">{cls.num}</span>
          <b
            className={`block mt-1 font-display text-[22px] font-normal normal-case tracking-[0] ${
              activeClass === cls.id ? "text-paper" : "text-ink"
            }`}
          >
            {cls.title}
          </b>
        </button>
      ))}
    </nav>
  );
}
