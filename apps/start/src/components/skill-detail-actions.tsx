import { ClaimAuthorButton } from "@/components/claim-author-button";
import { SkillArchiveDownloadButton } from "@/components/skill-archive-download-button";
import { useRouteContext } from "@tanstack/react-router";
import { SaveSkillButton } from "./save-skill-button";
import { SkillReportDialog } from "./skill-report-dialog";

interface Props {
  snapshotId: string | null;
  slug: string;
  skillId: string;
  title: string;
  version: string;
}

export const SkillDetailActions = ({ snapshotId, skillId, slug, title, version }: Props) => {
  const { currentUser } = useRouteContext({ from: "__root__" });

  return (
    <div className="flex flex-col gap-4">
      {snapshotId ? (
        <SkillArchiveDownloadButton version={version} snapshotId={snapshotId} compact={false} />
      ) : null}

      <SaveSkillButton slug={slug} compact={false} />
      <SkillReportDialog skillId={skillId} skillSlug={slug} skillTitle={title} />
      {currentUser ? null : <ClaimAuthorButton slug={slug} />}
    </div>
  );
};
