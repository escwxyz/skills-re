import { useSaveSkill } from "@/hooks/use-save-skill";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";
import { memo } from "react";

export const SaveSkillButton = memo(
  ({ slug, compact = false }: { slug: string; compact?: boolean }) => {
    const { isSaved, handleClick } = useSaveSkill({ slug });

    const renderLabel = () => {
      if (compact) {
        return null;
      }

      if (isSaved) {
        return m.skill_actions_saved_skill();
      }

      return m.skill_actions_save_skill();
    };

    return (
      <Button
        aria-label={m.skill_actions_save_skill()}
        title={m.skill_actions_save_skill()}
        size={compact ? "icon-sm" : "lg"}
        variant={compact ? "ghost" : "secondary"}
        onClick={handleClick}
        className="w-full max-w-md"
      >
        <BookmarkSimpleIcon arial-hidden className="size-4" weight={isSaved ? "fill" : "regular"} />
        {renderLabel()}
      </Button>
    );
  },
);
