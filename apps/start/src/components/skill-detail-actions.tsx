import { ClaimAuthorButton } from "@/components/claim-author-button";
import { SkillArchiveDownloadButton } from "@/components/skill-archive-download-button";
import { useRouteContext } from "@tanstack/react-router";
import { SaveSkillButton } from "./save-skill-button";

interface Props {
  snapshotId: string | null;
  slug: string;
  version: string;
}

export const SkillDetailActions = ({ snapshotId, slug, version }: Props) => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  return (
    <div className="flex flex-col gap-4">
      {snapshotId ? (
        <SkillArchiveDownloadButton version={version} snapshotId={snapshotId} compact={false} />
      ) : null}

      <SaveSkillButton slug={slug} compact={false} />
      {currentUser ? null : <ClaimAuthorButton slug={slug} />}
    </div>
  );
};
