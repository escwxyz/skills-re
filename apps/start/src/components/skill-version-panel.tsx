import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";

import { SkillVersionDialog } from "@/components/skill-version-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getSkillVersionHistory } from "@/functions/skills/get-skill-version-history";
import { cn } from "@/lib/utils";
import {
  skill_version_current_badge,
  skill_version_history,
  skill_version_selected,
  skill_version_view_full_changelog,
} from "@/paraglide/messages";
import type { SkillVersionHistoryItem } from "@/utils/types";

interface Props {
  author: string;
  repo: string;
  slug: string;
  onSnapshotChange: (snapshotId: string) => void;
  skillId: string;

  snapshotId?: string | null;
}

const VersionHistoryList = ({
  selectedSnapshotId,
  versions,
}: {
  selectedSnapshotId: string | null;
  versions: SkillVersionHistoryItem[];
}) => {
  const currentVersion =
    versions.find((version) => version.label === "current") ?? versions[0] ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">
          {skill_version_history()}
        </span>
      </div>

      <div className="font-mono">
        {versions.map((version, index) => {
          const isCurrent = version.snapshotId === currentVersion?.snapshotId;
          const isSelected = version.snapshotId === selectedSnapshotId;

          return (
            <div key={version.snapshotId}>
              <div className="flex items-baseline justify-between gap-4 py-3">
                <span
                  className={cn(
                    "min-w-0 truncate text-[11px] uppercase tracking-[.08em]",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  v.{version.version}
                  {isCurrent ? ` (${skill_version_current_badge()})` : ""}
                  {isSelected && !isCurrent ? ` (${skill_version_selected()})` : ""}
                </span>
                <span className="shrink-0 text-[10px] tracking-[.06em] text-muted-foreground">
                  {version.date}
                </span>
              </div>
              {index < versions.length - 1 ? (
                <div className="border-border border-b border-dashed opacity-70" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SkillVersionPanel = ({
  author,
  onSnapshotChange,
  repo,
  skillId,
  slug,
  snapshotId,
}: Props) => {
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
    <div className="border-border border-b p-[18px_22px]">
      <div className="mb-5">
        <VersionHistoryList selectedSnapshotId={selectedSnapshotId} versions={versions} />
      </div>

      <div className="flex items-center justify-between gap-4 pt-4">
        <Link
          className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground transition-colors hover:text-foreground"
          to="/skills/$author/$repo/$slug/changelog"
          params={{ author, repo, slug }}
          resetScroll={true}
        >
          {skill_version_view_full_changelog()}
        </Link>

        <SkillVersionDialog
          onSnapshotChange={onSnapshotChange}
          selectedSnapshotId={selectedSnapshotId}
          triggerClassName="min-w-36"
          versions={versions}
        />
      </div>
    </div>
  );
};

const SkillVersionPanelSkeleton = () => (
  <div className="border-border border-b p-[18px_22px]">
    <Skeleton className="mb-2.5 h-2.5 w-16" />
    <Skeleton className="mb-5 h-40 w-full" />
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-9 w-36" />
    </div>
  </div>
);
