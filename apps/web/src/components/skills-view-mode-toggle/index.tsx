"use client";

import { useStore } from "@nanostores/react";
import { skillsViewModeAtom } from "@/stores/app";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const SkillsViewModeToggle = ({ className }: { className?: string }) => {
  const viewMode = useStore(skillsViewModeAtom);

  const toggleViewMode = () => {
    skillsViewModeAtom.set(viewMode === "grid" ? "list" : "grid");
  };

  return (
    <ToggleGroup
      defaultValue={[viewMode]}
      multiple={false}
      onValueChange={toggleViewMode}
      className={className}

    >
      <ToggleGroupItem value="grid" className="cursor-pointer uppercase">
        Grid
      </ToggleGroupItem>
      <ToggleGroupItem value="list" className="cursor-pointer uppercase">
        List
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
