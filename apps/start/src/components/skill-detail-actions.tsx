import { m } from "@/paraglide/messages";

import { ClaimAuthorButton } from "@/components/claim-author-button";
import { SkillArchiveDownloadButton } from "@/components/skill-archive-download-button";
import { SaveSkillButton } from "@/components/save-skill-button";
import { useRouteContext } from "@tanstack/react-router";

interface Props {
  snapshotId: string | null;
  slug: string;
  version: string;
}

export const SkillDetailActions = ({ snapshotId, slug, version }: Props) => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  return (
    <div className="flex flex-col gap-2">
      <SkillArchiveDownloadButton
        ariaLabel={m.skill_actions_download_archive({ version })}
        className="w-full"
        snapshotId={snapshotId}
        title={m.skill_actions_download_archive({ version })}
      >
        {m.skill_actions_download_archive({ version })}
      </SkillArchiveDownloadButton>

      <SaveSkillButton slug={slug} />
      {currentUser ? null : <ClaimAuthorButton slug={slug} />}
    </div>
  );
};
