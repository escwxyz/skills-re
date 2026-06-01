import { Button } from "@/components/ui/button";
import { downloadSkillArchive } from "@/functions/skills/download-skill-archive";
import { m } from "@/paraglide/messages";
import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { memo } from "react";
import { useGoogleAnalytics } from "tanstack-router-ga4";

export const SkillArchiveDownloadButton = memo(
  ({
    snapshotId,
    compact = false,
    version,
  }: {
    snapshotId: string;
    compact?: boolean;
    version?: string;
  }) => {
    const ga = useGoogleAnalytics();

    const renderLabel = () => {
      if (version && !compact) {
        return m.skill_actions_download_archive({ version });
      }

      return null;
    };

    const handleDownload = () => {
      ga.event("file_download", {
        file_extension: "zip",
        snapshot_id: snapshotId,
      });
    };

    return (
      <form action={downloadSkillArchive.url} method="post">
        <input name="snapshotId" type="hidden" value={snapshotId} />
        <Button
          size={compact ? "icon-sm" : "lg"}
          type="submit"
          variant={compact ? "ghost" : "default"}
          className="w-full max-w-md"
          onClick={handleDownload}
        >
          <DownloadSimpleIcon aria-hidden className="size-4" />
          {renderLabel()}
        </Button>
      </form>
    );
  },
);
