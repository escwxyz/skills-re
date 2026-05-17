"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSkillSnapshotDiff } from "@/functions/skills/get-skill-snapshot-diff";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import type { buildSnapshotLineDiff } from "@/utils/skill-diff";
import {
  skill_snapshot_diff_base_label,
  skill_snapshot_diff_compare_button,
  skill_snapshot_diff_compare_label,
  skill_snapshot_diff_compare_version_label,
  skill_snapshot_diff_current_snapshot,
  skill_snapshot_diff_description,
  skill_snapshot_diff_error,
  skill_snapshot_diff_identical,
  skill_snapshot_diff_info,
  skill_snapshot_diff_loading,
  skill_snapshot_diff_loading_summary,
  skill_snapshot_diff_need_two_snapshots,
  skill_snapshot_diff_open_to_compare,
  skill_snapshot_diff_select_version,
  skill_snapshot_diff_summary,
  skill_snapshot_diff_title,
  skill_snapshot_diff_unavailable,
} from "@/paraglide/messages";
import type { SkillVersionHistoryItem } from "@/utils/types";
import { cn } from "@/lib/utils";

interface SkillSnapshotDiffLine {
  kind: "added" | "context" | "removed";
  leftLineNumber?: number;
  rightLineNumber?: number;
  text: string;
}

interface Props {
  currentSnapshotId: string | null;
  skillId: string;
  versions: SkillVersionHistoryItem[];
  triggerClassName?: string;
  triggerLabel?: string;
}

const getCompareSnapshotId = (
  versions: SkillVersionHistoryItem[],
  currentSnapshotId: string | null,
) => {
  const currentIndex = versions.findIndex((version) => version.snapshotId === currentSnapshotId);

  if (currentIndex === -1) {
    return versions[1]?.snapshotId ?? versions[0]?.snapshotId ?? null;
  }

  return versions[currentIndex + 1]?.snapshotId ?? versions[currentIndex - 1]?.snapshotId ?? null;
};

const getSelectedVersion = (versions: SkillVersionHistoryItem[], snapshotId: string | null) =>
  versions.find((version) => version.snapshotId === snapshotId) ?? null;

const DIFF_ROW_CLASS: Record<SkillSnapshotDiffLine["kind"], string> = {
  added: "border-[#1b7f37]/20 bg-[#1b7f37]/5 text-[#1b7f37]",
  context: "border-border bg-background text-ink",
  removed: "border-[#b42318]/20 bg-[#b42318]/5 text-[#b42318]",
};

const getRowMarker = (kind: SkillSnapshotDiffLine["kind"]) => {
  if (kind === "added") {
    return "+";
  }

  if (kind === "removed") {
    return "-";
  }

  return " ";
};

function DiffRow({ row }: { row: SkillSnapshotDiffLine }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[3.5rem_3.5rem_2.5rem_minmax(0,1fr)] items-start gap-2 border-b px-3 py-1.5 font-mono text-[10.5px] leading-5",
        DIFF_ROW_CLASS[row.kind],
      )}
    >
      <span className="text-right tabular-nums">
        {row.kind === "added" ? "" : row.leftLineNumber}
      </span>
      <span className="text-right tabular-nums">
        {row.kind === "removed" ? "" : row.rightLineNumber}
      </span>
      <span className="text-center uppercase tracking-[.18em]">{getRowMarker(row.kind)}</span>
      <span className="min-w-0 whitespace-pre-wrap wrap-break-word">{row.text || " "}</span>
    </div>
  );
}

const renderDiffBody = (params: {
  canCompare: boolean;
  diff: ReturnType<typeof buildSnapshotLineDiff> | null;
  error: boolean;
  loading: boolean;
}) => {
  const { canCompare, diff, error, loading } = params;

  if (!canCompare) {
    return (
      <div className="px-4 py-6 font-serif text-sm text-muted-foreground">
        {skill_snapshot_diff_need_two_snapshots()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6 font-serif text-sm text-muted-foreground">
        {skill_snapshot_diff_loading()}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 font-serif text-sm text-editorial-red">
        {skill_snapshot_diff_error()}
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="px-4 py-6 font-serif text-sm text-muted-foreground">
        {skill_snapshot_diff_open_to_compare()}
      </div>
    );
  }

  if (diff.lines.length === 0) {
    return (
      <div className="px-4 py-6 font-serif text-sm text-muted-foreground">
        {skill_snapshot_diff_identical()}
      </div>
    );
  }

  return (
    <div>
      {diff.lines.map((row, index) => (
        <DiffRow key={`${row.kind}-${index}`} row={row} />
      ))}
    </div>
  );
};

export const SkillSnapshotDiffDialog = ({
  currentSnapshotId,
  skillId,
  triggerClassName,
  triggerLabel,
  versions,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(
    getCompareSnapshotId(versions, currentSnapshotId),
  );
  const currentVersion = useMemo(
    () => getSelectedVersion(versions, currentSnapshotId),
    [currentSnapshotId, versions],
  );
  const compareVersion = useMemo(
    () => getSelectedVersion(versions, compareSnapshotId),
    [compareSnapshotId, versions],
  );

  const getSkillSnapshotDiffFn = useServerFn(getSkillSnapshotDiff);

  const canCompare = versions.length > 1 && currentSnapshotId !== null;
  const canFetch =
    open && canCompare && !!compareSnapshotId && currentSnapshotId !== compareSnapshotId;

  const {
    data: diff = null,
    isFetching: loading,
    isError: error,
  } = useQuery({
    queryKey: ["skill-snapshot-diff", skillId, currentSnapshotId, compareSnapshotId],
    queryFn: () => {
      if (!currentSnapshotId || !compareSnapshotId) {
        throw new Error("Missing snapshot IDs");
      }
      return getSkillSnapshotDiffFn({
        data: {
          baseSnapshotId: currentSnapshotId,
          compareSnapshotId,
          skillId,
        },
      });
    },
    enabled: canFetch,
  });

  useEffect(() => {
    setCompareSnapshotId(getCompareSnapshotId(versions, currentSnapshotId));
  }, [currentSnapshotId, versions]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button
            className={cn("w-full justify-between tracking-[.12em]", triggerClassName)}
            // todo: until we finish polish
            disabled
            // disabled={!canCompare}
            variant="outline"
          >
            {triggerLabel ?? skill_snapshot_diff_compare_button()}
          </Button>
        }
      />

      <DialogContent className="w-[min(96vw,72rem)] max-w-none overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-6 py-5">
          <DialogTitle className="font-display text-[24px] font-normal leading-tight">
            {skill_snapshot_diff_title()}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-[.18em]">
            {skill_snapshot_diff_description()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <div className="border-border bg-paper-2 border px-4 py-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
                    {skill_snapshot_diff_base_label()}
                  </div>
                  <div className="truncate font-mono text-[11px]">
                    {currentVersion
                      ? `v.${currentVersion.version}`
                      : skill_snapshot_diff_unavailable()}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {currentVersion?.date}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {currentVersion?.entryPath}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
                    {skill_snapshot_diff_compare_label()}
                  </div>
                  <div className="truncate font-mono text-[11px]">
                    {compareVersion
                      ? `v.${compareVersion.version}`
                      : skill_snapshot_diff_unavailable()}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {compareVersion?.date}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {compareVersion?.entryPath}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 border border-border">
              <div className="border-border border-b bg-background px-4 py-2 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
                {diff?.summary
                  ? skill_snapshot_diff_summary({
                      added: diff.summary.added,
                      context: diff.summary.context,
                      removed: diff.summary.removed,
                    })
                  : skill_snapshot_diff_loading_summary()}
              </div>

              <div className="max-h-[60vh] overflow-auto">
                {renderDiffBody({ canCompare, diff, error, loading })}
              </div>
            </div>
          </div>

          <div className="border-border bg-paper-2 border px-4 py-4">
            <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[.18em] text-muted-foreground">
              {skill_snapshot_diff_compare_version_label()}
            </div>

            <Select
              onValueChange={(value) => {
                if (typeof value === "string") {
                  setCompareSnapshotId(value);
                }
              }}
              value={compareSnapshotId}
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue className="min-w-0">
                  {(value: string | null) => {
                    const version = getSelectedVersion(versions, value);
                    return version ? `v.${version.version}` : skill_snapshot_diff_select_version();
                  }}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {versions
                  .filter((version) => version.snapshotId !== currentSnapshotId)
                  .map((version) => (
                    <SelectItem key={version.snapshotId} value={version.snapshotId}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm">v.{version.version}</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {version.date}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="mt-4 space-y-2 text-[11px] leading-5 text-muted-foreground">
              <p className="m-0">{skill_snapshot_diff_info()}</p>
              <p className="m-0">
                {skill_snapshot_diff_current_snapshot({
                  version: currentVersion
                    ? `v.${currentVersion.version}`
                    : skill_snapshot_diff_unavailable(),
                })}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
