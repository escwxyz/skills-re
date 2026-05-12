import { DownloadSimpleIcon, PackageIcon, UserPlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { SkillArchiveDownloadButton } from "@/components/skill-archive-download-button";
import { useClaimAuthor } from "@/hooks/use-claim-author";

interface Props {
  snapshotId: string | null;
  skillSlug: string;
}

export const SkillDetailTabActions = ({ snapshotId, skillSlug }: Props) => {
  const { handleClick } = useClaimAuthor({ skillSlug });

  return (
    <div className="ml-auto flex shrink-0 items-center justify-end px-3">
      <div className="flex items-center justify-end gap-1.5">
        <SkillArchiveDownloadButton
          ariaLabel={m.skill_tabs_actions_download_archive()}
          snapshotId={snapshotId}
          size="icon-sm"
          title={m.skill_tabs_actions_download_archive()}
        >
          <DownloadSimpleIcon aria-hidden className="size-4" />
        </SkillArchiveDownloadButton>

        <Button
          aria-label={m.skill_tabs_actions_sign_in_to_claim_as_author()}
          className=""
          size="icon-sm"
          type="button"
          title={m.skill_tabs_actions_sign_in_to_claim_as_author()}
          variant="outline"
          onClick={handleClick}
        >
          <UserPlusIcon aria-hidden className="size-4" />
        </Button>

        <Button
          aria-label={m.skill_tabs_actions_install()}
          className=""
          size="icon-sm"
          type="button"
          title={m.skill_tabs_actions_install()}
          variant="outline"
        >
          <PackageIcon aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
};
