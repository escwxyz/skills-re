import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Skeleton } from "@/components/ui/skeleton";
import { SkillSnapshotDiffDialog } from "@/components/skill-snapshot-diff-dialog";
import { SkillVersionSelect } from "@/components/skill-version-select";
import { VersionHistory } from "@/components/version-history";
import { getSkillVersionHistory } from "@/functions/skills/get-skill-version-history";

interface Props {
  onSnapshotChange: (snapshotId: string) => void;
  skillId: string;

  snapshotId?: string | null;
}

export const SkillVersionPanel = ({ onSnapshotChange, skillId, snapshotId }: Props) => {
  const getVersionHistory = useServerFn(getSkillVersionHistory);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["skillVersionHistory", skillId],
    queryFn: () => getVersionHistory({ data: { skillId } }),
    // todo: adjust based on backend refetch interval
    refetchInterval: 60 * 60 * 1000,
  });

  if (isLoading) {
    return <SkillVersionPanelSkeleton />;
  }

  if (!versions?.length) {
    return null;
  }

  const selectedSnapshotId =
    versions.find((v) => v.snapshotId === snapshotId)?.snapshotId ??
    versions[0]?.snapshotId ??
    null;

  return (
    <>
      <div className="border-border border-b p-[18px_22px]">
        <SkillVersionSelect
          onSnapshotChange={onSnapshotChange}
          selectedSnapshotId={selectedSnapshotId}
          versions={versions}
        />
        <div className="mt-3">
          <SkillSnapshotDiffDialog
            currentSnapshotId={selectedSnapshotId}
            skillId={skillId}
            versions={versions}
          />
        </div>
      </div>

      <div className="border-border border-b p-[18px_22px]">
        <VersionHistory activeSnapshotId={selectedSnapshotId} versions={versions} />
      </div>
    </>
  );
};

const SkillVersionPanelSkeleton = () => (
  <>
    <div className="border-border border-b p-[18px_22px]">
      <Skeleton className="mb-2.5 h-2.5 w-16" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="mt-3 h-8 w-full" />
    </div>
    <div className="border-border border-b p-[18px_22px]">
      <Skeleton className="mb-3 h-2.5 w-24" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="mb-2 h-8 w-full" />
      ))}
    </div>
  </>
);
