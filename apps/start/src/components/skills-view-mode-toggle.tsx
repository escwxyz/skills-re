"use client";

import { useAtom } from "jotai";
import { GridFourIcon, ListBulletsIcon } from "@phosphor-icons/react";

import { skillsViewModeAtom } from "@/atoms/app";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SkillsViewModeToggle = ({ className }: { className?: string }) => {
  const [viewMode, setViewMode] = useAtom(skillsViewModeAtom);

  return (
    <>
      <Button
        aria-pressed={viewMode === "grid"}
        aria-label="Grid view"
        className={cn("h-full rounded-none border-l border-border", className)}
        onClick={() => setViewMode("grid")}
        size="icon-sm"
        type="button"
        variant={viewMode === "grid" ? "default" : "ghost"}
      >
        <GridFourIcon />
      </Button>
      <Button
        aria-pressed={viewMode === "list"}
        aria-label="List view"
        className={cn("h-full rounded-none border-l border-border", className)}
        onClick={() => setViewMode("list")}
        size="icon-sm"
        type="button"
        variant={viewMode === "list" ? "default" : "ghost"}
      >
        <ListBulletsIcon />
      </Button>
    </>
  );
};
