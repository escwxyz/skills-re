"use client";

import { LayoutGroup, motion } from "motion/react";
import { useStore } from "@nanostores/react";
import type { BrowseSkillItem } from "@/lib/registry-data";
import { SkillCard } from "@/components/skill-card";
import { skillsFiltersSidebarOpenAtom } from "@/stores/app";

const TRANSITION = { duration: 0.2, ease: "easeInOut" } as const;

interface Props {
  skills: BrowseSkillItem[];
}

export function SkillGrid({ skills }: Props) {
  const isSidebarOpen = useStore(skillsFiltersSidebarOpenAtom);

  return (
    <LayoutGroup>
      <motion.div
        layout
        transition={TRANSITION}
        className={`grid border-l border-t border-rule ${
          isSidebarOpen
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {skills.map((skill) => (
          <motion.div key={skill.id} layout transition={TRANSITION} className="min-w-0">
            <SkillCard skill={skill} />
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  );
}
