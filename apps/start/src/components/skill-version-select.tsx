"use client";

import type { SkillVersionHistoryItem } from "@/utils/types";
import {
  skill_detail_meta_version,
  skill_version_current_badge,
  skill_version_latest,
} from "@/paraglide/messages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  selectedSnapshotId: string | null;
  onSnapshotChange: (snapshotId: string) => void;
  versions: SkillVersionHistoryItem[];
}

const getSelectedVersion = (
  versions: SkillVersionHistoryItem[],
  selectedSnapshotId: string | null,
) => versions.find((version) => version.snapshotId === selectedSnapshotId) ?? versions[0] ?? null;

export const SkillVersionSelect = ({ onSnapshotChange, selectedSnapshotId, versions }: Props) => {
  const selectedVersion = getSelectedVersion(versions, selectedSnapshotId);

  if (!selectedVersion) {
    return null;
  }

  return (
    <div>
      <div className="mb-2.5 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
        {skill_detail_meta_version()}
      </div>

      <Select
        onValueChange={(value) => {
          if (typeof value !== "string") {
            return;
          }

          onSnapshotChange(value);
        }}
        value={selectedVersion.snapshotId}
      >
        <SelectTrigger className="w-full justify-between">
          <SelectValue>
            {(value: string | null) => {
              const version = getSelectedVersion(versions, value);

              if (!version) {
                return skill_version_latest();
              }

              return (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">
                    v.{version.version}
                    {version.label === "current" ? ` · ${skill_version_current_badge()}` : ""}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground">{version.date}</span>
                </span>
              );
            }}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {versions.map((version) => (
            <SelectItem key={version.snapshotId} value={version.snapshotId}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">
                  v.{version.version}
                  {version.label === "current" ? ` · ${skill_version_current_badge()}` : ""}
                </span>
                <span className="truncate text-[10px] text-muted-foreground">{version.date}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
