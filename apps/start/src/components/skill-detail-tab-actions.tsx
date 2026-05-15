import { SkillArchiveDownloadButton } from "@/components/skill-archive-download-button";

import { SaveSkillButton } from "./save-skill-button";

interface Props {
  snapshotId: string | null;
  skillSlug: string;
}

export const SkillDetailTabActions = ({ snapshotId, skillSlug }: Props) => (
  <div className="flex ml-auto px-3 items-center justify-end gap-1.5">
    {snapshotId ? <SkillArchiveDownloadButton snapshotId={snapshotId} compact /> : null}

    <SaveSkillButton slug={skillSlug} compact />
  </div>
);
