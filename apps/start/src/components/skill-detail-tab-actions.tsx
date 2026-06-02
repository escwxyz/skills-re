import { SkillArchiveDownloadButton } from "@/components/skill-archive-download-button";

import { SaveSkillButton } from "./save-skill-button";
import { cn } from "@/lib/utils";

interface Props {
  snapshotId: string | null;
  skillSlug: string;
  className?: string;
}

export const SkillDetailTabActions = ({ className, snapshotId, skillSlug }: Props) => (
  <div
    className={cn(
      "hidden w-auto items-center justify-end gap-1.5 px-3 py-2 lg:flex lg:ml-auto lg:flex-nowrap",
      className,
    )}
  >
    {snapshotId ? <SkillArchiveDownloadButton snapshotId={snapshotId} compact /> : null}

    <SaveSkillButton slug={skillSlug} compact />
  </div>
);
